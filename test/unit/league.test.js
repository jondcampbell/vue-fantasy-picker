// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createLeagueHandler, leagueUrl } from '../../server/espnLeague';
import { parseLeague } from '../../client/sources/espnLeague';
import { espnPlayersUrl } from '../../client/sources/espn';
import { usePickerStore } from '../../client/store';
import Icon from '../../client/components/Icon.vue';
import RosterCard from '../../client/components/partials/RosterCard.vue';

// Synthetic league in the shape ESPN returns for views mTeam + mRoster + mSettings (fake teams and SWIDs)
const MY_SWID = '{MY-SWID}';
const espnJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures/espn-players-2027.json'), 'utf8'));
const espnId = name => String(espnJson.find(p => p.fullName === name).id);
const entry = (name, lineupSlotId) => ({ playerId: Number(espnId(name)), lineupSlotId, playerPoolEntry: { player: { id: Number(espnId(name)), fullName: name } } });
const ROOKIE = { playerId: 5555555, lineupSlotId: 12, playerPoolEntry: { player: { id: 5555555, fullName: 'Rookie Prospect' } } };
const league = ({ drafted = true, items } = {}) => ({
	settings: {
		name: 'Test League',
		rosterSettings: { lineupSlotCounts: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 11: 3, 12: 4, 13: 1 } },
		scoringSettings: {
			scoringType: 'H2H_MOST_CATEGORIES',
			scoringItems: items || [20, 6, 0, 1, 17, 2, 11, 3, 19].map(statId => ({ statId, isReverseItem: statId === 11 }))
		}
	},
	draftDetail: { drafted },
	teams: [
		{ id: 1, name: 'My Squad', abbrev: 'ME', owners: [MY_SWID], roster: { entries: drafted ? [entry('Nikola Jokic', 4), entry('LeBron James', 2), entry('Russell Westbrook', 13), ROOKIE] : [] } },
		{ id: 2, name: 'Rivals', abbrev: 'RIV', owners: ['{OTHER}'], roster: { entries: drafted ? [entry('Victor Wembanyama', 4)] : [] } }
	]
});

describe('league proxy (server/espnLeague.js)', () => {
	const env = { ESPN_LEAGUE_ID: '31426', ESPN_S2: 's2-token', ESPN_SWID: MY_SWID };

	it('calls the league endpoint with the cookies and returns the SWID header', async () => {
		const calls = [];
		const handle = createLeagueHandler(env, async (url, options) => {
			calls.push({ url, cookie: options.headers.Cookie });
			return { ok: true, status: 200, text: async () => '{"ok":1}' };
		});
		const result = await handle('/espn-league?season=2027');
		expect(calls).toEqual([{ url: leagueUrl(2027, '31426'), cookie: `espn_s2=s2-token; SWID=${MY_SWID}` }]);
		expect(leagueUrl(2027, '31426')).toBe('https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2027/segments/0/leagues/31426?view=mTeam&view=mRoster&view=mSettings');
		expect(result).toEqual({ status: 200, headers: { 'content-type': 'application/json', 'x-espn-swid': MY_SWID }, body: '{"ok":1}' });
	});

	it('caches for a minute so repeated syncs do not hit ESPN', async () => {
		let calls = 0;
		let time = 0;
		const handle = createLeagueHandler(env, async () => { calls++; return { ok: true, status: 200, text: async () => '{}' }; }, () => time);
		await handle('/espn-league?season=2027');
		time = 59 * 1000;
		expect((await handle('/espn-league?season=2027')).headers['x-espn-cache']).toBe('hit');
		expect(calls).toBe(1);
		time = 61 * 1000;
		await handle('/espn-league?season=2027');
		expect(calls).toBe(2);
	});

	it('explains missing settings, bad input, expired cookies and network errors', async () => {
		const body = result => JSON.parse(result.body).error;
		const missing = await createLeagueHandler({ ESPN_LEAGUE_ID: '1' })('/espn-league?season=2027');
		expect(missing.status).toBe(500);
		expect(body(missing)).toBe('Missing ESPN_S2, ESPN_SWID in .env.local. Add them and restart the dev server.');

		expect((await createLeagueHandler(env, async () => { throw new Error('no'); })('/espn-league?season=abc')).status).toBe(400);

		const expired = await createLeagueHandler(env, async () => ({ ok: false, status: 401 }))('/espn-league?season=2027');
		expect(expired.status).toBe(401);
		expect(body(expired)).toContain('may have expired');

		const offline = await createLeagueHandler(env, async () => { throw new Error('getaddrinfo ENOTFOUND'); })('/espn-league?season=2027');
		expect(offline.status).toBe(502);
		expect(body(offline)).toBe("Couldn't reach ESPN: getaddrinfo ENOTFOUND");
	});
});

describe('parseLeague', () => {
	it('reads lineup slots, scoring categories and rosters', () => {
		const parsed = parseLeague(league(), MY_SWID);
		expect(parsed.rosterSlots).toEqual(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'UTIL', 'UTIL', 'Bench', 'Bench', 'Bench', 'Bench', 'IR']);
		expect(parsed.categories.map(c => c.column)).toEqual(['FT%', 'TRB', 'PTS', 'BLK', '3P', 'STL', 'TOV', 'AST', 'FG%']);
		expect(parsed.categories.find(c => c.column === 'TOV').reverse).toBe(true);
		expect(parsed.myTeam).toEqual({ id: 1, name: 'My Squad', abbrev: 'ME' });
		expect(parsed.teams[0].players.map(p => p.slot)).toEqual(['C', 'SF', 'IR', 'Bench']);
		expect(parsed.drafted).toBe(true);
	});

	it('reports categories the app cannot score', () => {
		const parsed = parseLeague(league({ items: [{ statId: 0 }, { statId: 37 }] }), MY_SWID);
		expect(parsed.categories).toEqual([
			{ statId: 0, column: 'PTS', reverse: false, name: 'PTS' },
			{ statId: 37, column: null, reverse: false, name: 'Double-doubles' }
		]);
	});

	it('knows the league has not drafted yet', () => {
		expect(parseLeague(league({ drafted: false }), MY_SWID).drafted).toBe(false);
	});
});

describe('syncLeague', () => {
	const NOW = new Date(2026, 9, 9);
	let store;
	const network = (leagueJson, leagueStatus = 200) => async (url) => {
		if (url.startsWith('/espn-league')) {
			return {
				ok: leagueStatus === 200,
				status: leagueStatus,
				headers: { get: name => (name === 'x-espn-swid' ? MY_SWID : null) },
				json: async () => (leagueStatus === 200 ? leagueJson : { error: 'ESPN rejected the login cookies. They may have expired.' })
			};
		}
		if (url === espnPlayersUrl(2027)) {
			return { ok: true, json: async () => espnJson };
		}
		return { ok: true, json: async () => ({ data: [], pagination: { pages: 1 } }) };
	};

	beforeEach(async () => {
		store = usePickerStore(createPinia());
		await store.updateStats({ fetchImpl: network(null), now: NOW });
		store.changeConfigSetting({ config_key: 'ranking_only_columns', config_value: [26, 27] });
	});

	it('before the draft: applies settings, keeps your lists', async () => {
		store.addToList({ list: 'my_team', key: `espn:${espnId('Nikola Jokic')}` });
		const result = await store.syncLeague({ fetchImpl: network(league({ drafted: false })), now: NOW });

		expect(result).toMatchObject({ teamName: 'My Squad', teams: 2, drafted: false, myPlayers: 0, skippedCategories: [] });
		expect(store.my_team).toEqual([`espn:${espnId('Nikola Jokic')}`]);
		expect(store.config.key_columns).toEqual([10, 11, 20, 23, 24, 25, 26, 27, 29]);
		expect(store.config.negative_columns).toEqual([27]);
		// Your Ranking Only choice survives the sync: BLK and TOV stay out of your overall score
		expect(store.config.ranking_only_columns).toEqual([26, 27]);
		expect(store.keyColumns).not.toContain('BLK');
		expect(store.keyColumns).not.toContain('TOV');
		const jokic = store.scores.find(score => score.playerName === 'Nikola Jokic').scoreData;
		const overall = [10, 11, 20, 23, 24, 25, 29];
		expect(jokic.total).toBeCloseTo(overall.reduce((sum, column) => sum + jokic[column], 0) / overall.length, 3);
		expect(jokic[26]).toBeGreaterThan(0);
		expect(store.config.roster_slots.length).toBe(15);
	});

	it('after the draft: replaces My Team, Taken and IR from the league', async () => {
		store.addToList({ list: 'watch_list', key: `espn:${espnId('Victor Wembanyama')}` });
		store.addToList({ list: 'taken_players', key: 'someone-else' });
		const result = await store.syncLeague({ fetchImpl: network(league()), now: NOW });

		const key = name => `espn:${espnId(name)}`;
		expect(result).toMatchObject({ teamName: 'My Squad', drafted: true, myPlayers: 4, takenPlayers: 1 });
		expect(store.my_team).toEqual([key('Nikola Jokic'), key('LeBron James'), key('Russell Westbrook'), 'espn:5555555']);
		expect(store.taken_players).toEqual([key('Victor Wembanyama')]);
		expect(store.ir_players).toEqual([key('Russell Westbrook')]);
		// Watch list is kept
		expect(store.watch_list).toEqual([key('Victor Wembanyama')]);
		expect(store.list_names['espn:5555555']).toBe('Rookie Prospect');
		expect(store.league.syncedAt).toBe(NOW.getTime());
	});

	it('shows rostered players with no stats on the roster without flagging them', async () => {
		store.espn_players = { ...store.espn_players, 5555555: { name: 'Rookie Prospect', team: 'BOS', pos: 'SG', eligible: ['SG'], injury: 'ACTIVE', espnRank: null } };
		await store.syncLeague({ fetchImpl: network(league()), now: NOW });
		expect(store.listIssues).toEqual([]);
		const rookie = store.rosterPlayers.find(player => player.key === 'espn:5555555');
		expect(rookie).toMatchObject({ name: 'Rookie Prospect', position: 'SG', score: undefined });
		const card = mount(RosterCard, { global: { components: { icon: Icon }, config: { globalProperties: { $store: store } } } });
		// No stats, so lowest priority, but the open SG slot still takes him
		const row = card.findAll('tbody tr').find(tr => tr.text().includes('Rookie Prospect'));
		expect(row.find('td').text()).toBe('SG');
		expect(row.text()).toContain('—');
		expect(card.findAll('tbody tr').find(tr => tr.text().includes('Russell Westbrook')).find('td').text()).toBe('IR');
	});

	it('passes on proxy errors and refuses to sync rosters if your team is not found', async () => {
		await expect(store.syncLeague({ fetchImpl: network(null, 401), now: NOW })).rejects.toThrow('may have expired');
		const strangers = league();
		strangers.teams[0].owners = ['{NOT-ME}'];
		store.addToList({ list: 'my_team', key: 'keep-me' });
		await expect(store.syncLeague({ fetchImpl: network(strangers), now: NOW })).rejects.toThrow('check ESPN_SWID');
		expect(store.my_team).toEqual(['keep-me']);
	});
});
