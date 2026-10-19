// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { createPinia } from 'pinia';
import { nextTick } from 'vue';
import fs from 'node:fs';
import path from 'node:path';
import papaparse from 'papaparse';
import { usePickerStore } from '../../client/store';
import { buildSnapshot, shareSnapshot, SNAPSHOT_ROUTE } from '../../client/store/snapshot';
import { createSnapshotHandler } from '../../server/stateSnapshot';

const leagueStore = () => {
	const store = usePickerStore(createPinia());
	store.$patch({
		my_team: ['jokicni01', 'espn:5555555'],
		ir_players: ['espn:5555555'],
		taken_players: ['wembavi01'],
		watch_list: ['n:someone'],
		list_names: { jokicni01: 'Nikola Jokić', 'espn:5555555': 'Rookie Prospect', wembavi01: 'Victor Wembanyama', 'n:someone': 'Some One' },
		espn_links: { 3112335: 'jokicni01' },
		league: {
			name: 'Test League', teamName: 'My Squad', teams: 2, drafted: true, syncedAt: 1, skippedCategories: [],
			rosters: [
				{ name: 'My Squad', abbrev: 'ME', mine: true, players: [{ espnId: '3112335', name: 'Nikola Jokić', slot: 'C' }, { espnId: '5555555', name: 'Rookie Prospect', slot: 'IR' }] },
				{ name: 'Rivals', abbrev: 'RIV', mine: false, players: [{ espnId: '5104157', name: 'Victor Wembanyama', slot: 'C' }] }
			]
		}
	});
	return store;
};

describe('state snapshot', () => {
	it('summarizes the lists and every league roster with names', () => {
		const store = leagueStore();
		const snapshot = buildSnapshot(store);
		expect(snapshot.league).toEqual({ name: 'Test League', teamName: 'My Squad', drafted: true, syncedAt: 1 });
		const unscored = { injury: null, positions: [], score: null, categories: null, stats: null, games: null };
		expect(snapshot.myTeam).toEqual([
			{ key: 'jokicni01', name: 'Nikola Jokić', ...unscored, ir: false },
			{ key: 'espn:5555555', name: 'Rookie Prospect', ...unscored, ir: true }
		]);
		expect(snapshot.taken).toEqual([{ key: 'wembavi01', name: 'Victor Wembanyama' }]);
		expect(snapshot.watchList).toEqual([{ key: 'n:someone', name: 'Some One' }]);
		store.espn_players = { 3112335: { name: 'Nikola Jokić', pos: 'C', eligible: ['C'], injury: 'OUT' } };
		expect(buildSnapshot(store).myTeam[0].injury).toBe('OUT');
		expect(snapshot.teams.map(team => team.name)).toEqual(['My Squad', 'Rivals']);
		// Linked ESPN IDs use the Basketball-Reference key, unlinked ones espn:<id>
		expect(snapshot.teams[0].players.map(player => player.key)).toEqual(['jokicni01', 'espn:5555555']);
		expect(snapshot.teams[1].players).toEqual([{ key: 'espn:5104157', name: 'Victor Wembanyama', slot: 'C', injury: null, positions: [], score: null, categories: null, stats: null, games: null }]);
	});

	it('includes category scores, per-game stats and the best free agents', () => {
		const store = usePickerStore(createPinia());
		const csv = fs.readFileSync(path.resolve(process.cwd(), 'samplestats.csv'), 'utf8');
		store.changeConfigSetting({ config_key: 'pos_column', config_value: 2 }); // older export format
		store.importPlayers(papaparse.parse(csv).data);
		const [best, second] = [...store.scores].sort((a, b) => b.scoreData.total - a.scoreData.total);
		store.addToList({ list: 'my_team', key: best.playerKey });

		const snapshot = buildSnapshot(store);
		const headers = snapshot.categories.map(category => category.name);
		expect(headers).toContain('PTS');
		expect(snapshot.categories.find(category => category.name === 'BLK').inOverall).toBe(false);
		const mine = snapshot.myTeam[0];
		expect(Object.keys(mine.categories)).toEqual(headers);
		expect(mine.categories.PTS).toBeCloseTo(best.scoreData[store.columns.indexOf('PTS')], 2);
		expect(mine.stats.PTS).toBeGreaterThan(0);
		expect(mine.games).toBeGreaterThan(0);
		// Rostered players aren't free agents
		expect(snapshot.freeAgents.length).toBe(40);
		expect(snapshot.freeAgents[0].key).toBe(second.playerKey);
		expect(snapshot.freeAgents.map(player => player.key)).not.toContain(best.playerKey);
	});

	it('works before any data or league sync', () => {
		const snapshot = buildSnapshot(usePickerStore(createPinia()));
		expect(snapshot).toMatchObject({ league: null, myTeam: [], taken: [], watchList: [], teams: [] });
	});

	it('posts on start and on changes, skipping changes that leave it the same', async () => {
		const store = leagueStore();
		const posts = [];
		shareSnapshot(store, async (url, options) => posts.push({ url, options }));
		await nextTick();
		expect(posts.length).toBe(1);
		expect(posts[0].url).toBe(SNAPSHOT_ROUTE);
		expect(posts[0].options.method).toBe('POST');

		store.changeScreen(3);
		await nextTick();
		expect(posts.length).toBe(1);

		store.addToList({ list: 'watch_list', key: 'jokicni01' });
		await nextTick();
		expect(posts.length).toBe(2);
		expect(JSON.parse(posts[1].options.body).watchList.map(player => player.key)).toEqual(['n:someone', 'jokicni01']);
	});

	it('ignores a missing dev server', async () => {
		const store = leagueStore();
		shareSnapshot(store, async () => { throw new Error('offline'); });
		store.addToList({ list: 'watch_list', key: 'jokicni01' });
		await nextTick();
		expect(store.watch_list).toContain('jokicni01');
	});
});

describe('snapshot route (server/stateSnapshot.js)', () => {
	it('writes the posted JSON with a timestamp', async () => {
		const written = [];
		const handle = createSnapshotHandler(async json => written.push(json), () => new Date('2026-10-18T20:00:00Z'));
		expect(await handle('{"myTeam":[]}')).toEqual({ status: 204, body: '' });
		expect(JSON.parse(written[0])).toEqual({ savedAt: '2026-10-18T20:00:00.000Z', myTeam: [] });
	});

	it('rejects bodies that are not a JSON object', async () => {
		const written = [];
		const handle = createSnapshotHandler(async json => written.push(json));
		expect((await handle('{nope')).status).toBe(400);
		expect((await handle('[1]')).status).toBe(400);
		expect(written).toEqual([]);
	});
});
