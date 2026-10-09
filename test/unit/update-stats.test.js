// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createPinia } from 'pinia';
import { usePickerStore } from '../../client/store';
import { restoreState } from '../../client/store/persist';
import { espnPlayersUrl } from '../../client/sources/espn';

const fixture = name => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures', name), 'utf8'));
const espnJson = fixture('espn-players-2027.json');
const nbaapi2026 = fixture('nbaapi-playertotals-2026.json');
const NOW = new Date(2026, 9, 9); // October 9, 2026: before the 2026-27 tip-off

// Fake network: ESPN player pool, nbaapi 2025-26 in one page, nbaapi 2026-27 empty (pre-season)
const fakeFetch = (overrides = {}) => async (url) => {
	if (overrides[url]) {
		return overrides[url]();
	}
	if (url === espnPlayersUrl(2027)) {
		return { ok: true, json: async () => espnJson };
	}
	const season = new URL(url).searchParams.get('season');
	const data = season === '2026' ? nbaapi2026 : [];
	return { ok: true, json: async () => ({ data, pagination: { pages: 1 } }) };
};

describe('updateStats', () => {
	let store;
	beforeEach(() => {
		store = usePickerStore(createPinia());
	});

	it('stores ESPN and Basketball-Reference datasets and links both ID systems', async () => {
		const progress = [];
		const result = await store.updateStats({ fetchImpl: fakeFetch(), onProgress: message => progress.push(message), now: NOW });

		expect(Object.keys(store.datasets).sort()).toEqual(['bbref-actual-2026', 'espn-actual-2026', 'espn-projection-2027']);
		expect(result).toMatchObject({ datasets: 3, linked: 4, unlinked: 1, warnings: [] });
		expect(progress[0]).toBe('Downloading ESPN players…');

		// Pre-season: ESPN's 2026-27 projection is the default dataset
		expect(store.active_dataset).toBe('espn-projection-2027');
		expect(store.datasetList.map(d => d.label)).toEqual(['2026-27 ESPN Projection', '2025-26 Actual', '2025-26 Actual (Basketball-Reference)']);

		// ESPN rows are keyed by the linked Basketball-Reference ID
		const jokicEspnId = Object.keys(store.espn_links).find(id => store.espn_links[id] === 'jokicni01');
		expect(store.keyRows.has('jokicni01')).toBe(true);
		expect(store.espnInfo.get('jokicni01')).toMatchObject({ espnId: jokicEspnId, eligible: ['C'], espnRank: 1, team: 'DEN' });

		// "Ronald Holland II" vs "Ron Holland" is left for you, with a suggestion
		expect(store.unlinked).toEqual([expect.objectContaining({ name: 'Ronald Holland II', dismissed: false })]);
		expect(store.unlinked[0].candidates[0].bbrefId).toBe('hollaro01');
	});

	it('scores the projection for the Proj column whichever dataset is active', async () => {
		await store.updateStats({ fetchImpl: fakeFetch(), now: NOW });
		store.changeConfigSetting({ config_key: 'min_games_played', config_value: 1 });
		expect(Object.keys(store.projection_totals).length).toBeGreaterThan(0);
		const projected = store.projection_totals.jokicni01;

		store.useDataset('bbref-actual-2026');
		expect(store.config.key_column).toBe(32);
		expect(store.config.espn_column).toBe(33);
		expect(store.keyRows.has('jokicni01')).toBe(true);
		expect(store.projection_totals.jokicni01).toBe(projected);
	});

	it('keeps lists, and moves ESPN-keyed entries once they are linked by hand', async () => {
		await store.updateStats({ fetchImpl: fakeFetch(), now: NOW });
		store.changeConfigSetting({ config_key: 'min_games_played', config_value: 1 });
		store.useDataset('espn-actual-2026');
		const holland = store.unlinked[0].espnId;
		store.addToList({ list: 'watch_list', key: 'jokicni01' });
		store.addToList({ list: 'watch_list', key: `espn:${holland}` });
		expect(store.isWatched(`espn:${holland}`)).toBe(true);

		store.linkPlayer(holland, 'hollaro01');
		expect(store.watch_list).toEqual(['jokicni01', 'hollaro01']);
		expect(store.unlinked).toEqual([]);
		expect(store.keyRows.has('hollaro01')).toBe(true);

		// Switching sources keeps the same players on the list
		store.useDataset('bbref-actual-2026');
		expect(store.watchList.length).toBe(2);
		expect(store.listIssues).toEqual([]);
	});

	it('remembers dismissed link suggestions across updates', async () => {
		await store.updateStats({ fetchImpl: fakeFetch(), now: NOW });
		store.dismissLink(store.unlinked[0].espnId);
		const result = await store.updateStats({ fetchImpl: fakeFetch(), now: NOW });
		expect(result.unlinked).toBe(0);
		expect(store.unlinked[0].dismissed).toBe(true);
	});

	it('still works when nbaapi is down, keying ESPN players by ESPN ID', async () => {
		const down = async () => ({ ok: false, status: 503 });
		const fetchImpl = async (url) => (url.includes('nbaapi') ? down() : fakeFetch()(url));
		const result = await store.updateStats({ fetchImpl, now: NOW });
		expect(result.warnings).toEqual(['2026-27', '2025-26', '2024-25'].map(label => `Basketball-Reference ${label}: nbaapi returned 503`));
		expect(Object.keys(store.datasets).sort()).toEqual(['espn-actual-2026', 'espn-projection-2027']);
		expect([...store.keyRows.keys()].every(key => key.startsWith('espn:'))).toBe(true);
	});

	it('fails cleanly when ESPN is unreachable, leaving existing data alone', async () => {
		store.importPlayers([['Rk', 'Player'], [1, 'Someone']]);
		await expect(store.updateStats({ fetchImpl: fakeFetch({ [espnPlayersUrl(2027)]: async () => ({ ok: false, status: 500 }) }), now: NOW })).rejects.toThrow('ESPN returned 500');
		expect(Object.keys(store.datasets)).toEqual(['csv']);
		expect(store.active_dataset).toBe('csv');
	});
});

describe('saved state from before datasets', () => {
	it('becomes an "Imported CSV" dataset that is not converted to per-game again', () => {
		const store = usePickerStore(createPinia());
		const defaults = store.$state;
		const players = [[1, 'Nikola Jokić', 30, 'DEN', 'C', 70, 70, 2400, 0, 0, 0.58, 1.4, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 12.7, 10.2, 1.8, 0.6, 3.1, 0, 29.6, 0, '', 'jokicni01']];
		const columns = ['Rk', 'Player', 'Age', 'Team', 'Pos', 'G', 'GS', 'MP', 'FG', 'FGA', 'FG%', '3P', '3PA', '3P%', '2P', '2PA', '2P%', 'eFG%', 'FT', 'FTA', 'FT%', 'ORB', 'DRB', 'TRB', 'AST', 'STL', 'BLK', 'TOV', 'PF', 'PTS', 'Trp-Dbl', 'Awards', 'Player-additional'];
		const state = restoreState(defaults, { config: { key_column: 32, ranking_only_columns: [26, 27] }, columns, players });
		expect(state.active_dataset).toBe('csv');
		expect(state.datasets.csv.normalized).toBe(true);

		store.$state = state;
		store.useDataset('csv');
		// Points per game stays 29.6 rather than being divided by games again
		expect(store.players[0][29]).toBe(29.6);
	});
});
