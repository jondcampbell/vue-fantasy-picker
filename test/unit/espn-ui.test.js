// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { usePickerStore } from '../../client/store';
import { espnPlayersUrl } from '../../client/sources/espn';
import Icon from '../../client/components/Icon.vue';
import DataPage from '../../client/components/pages/ImportData.vue';
import Scores from '../../client/components/pages/Scores.vue';
import RosterCard from '../../client/components/partials/RosterCard.vue';

const fixture = name => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures', name), 'utf8'));
const espnJson = fixture('espn-players-2027.json');
const nbaapi2026 = fixture('nbaapi-playertotals-2026.json');
const NOW = new Date(2026, 9, 9);
const fakeFetch = async (url) => {
	if (url === espnPlayersUrl(2027)) {
		return { ok: true, json: async () => espnJson };
	}
	const season = new URL(url).searchParams.get('season');
	return { ok: true, json: async () => ({ data: season === '2026' ? nbaapi2026 : [], pagination: { pages: 1 } }) };
};

describe('ESPN data in the UI', () => {
	const store = usePickerStore(createPinia());
	const mountWith = component => mount(component, { global: { components: { icon: Icon }, config: { globalProperties: { $store: store } } } });

	beforeAll(async () => {
		await store.updateStats({ fetchImpl: fakeFetch, now: NOW });
		store.changeConfigSetting({ config_key: 'min_games_played', config_value: 1 });
	});

	it('lists datasets on the Data page and links players by hand', async () => {
		const page = mountWith(DataPage);
		expect(page.text()).toContain('2026-27 ESPN Projection');
		expect(page.text()).toContain('2025-26 Actual (Basketball-Reference)');
		expect(page.text()).toContain('Link players · 1');
		expect(page.text()).toContain('Ronald Holland II');

		await page.findAll('button').find(b => b.text().startsWith('Ron Holland')).trigger('click');
		expect(store.espn_links[store.espnInfo.get('hollaro01').espnId]).toBe('hollaro01');
		expect(page.text()).not.toContain('Link players');

		await page.findAll('button').find(b => b.text() === 'Use').trigger('click');
		await flushPromises();
		expect(page.findAll('.chip').filter(c => c.text() === 'Active').length).toBe(1);
	});

	it('shows Proj and ESPN rank columns and switches datasets', async () => {
		store.useDataset('espn-actual-2026');
		const page = mountWith(Scores);
		const headers = page.findAll('thead th').map(th => th.text());
		expect(headers).toContain('Proj');
		expect(headers).toContain('ESPN rk');

		const jokicRow = page.findAll('tbody tr').find(tr => tr.text().includes('Nikola Jokic'));
		const cells = jokicRow.findAll('td').map(td => td.text());
		expect(cells[cells.length - 1]).toBe('1');
		expect(cells[cells.length - 2]).toBe(store.projection_totals.jokicni01.toFixed(2));

		await page.findAll('button').find(b => b.text() === '2025-26 Actual (Basketball-Reference)').trigger('click');
		expect(store.active_dataset).toBe('bbref-actual-2026');
		expect(page.findAll('tbody tr').some(tr => tr.text().includes('Nikola Jokić'))).toBe(true);
	});

	it('shows injury badges from ESPN', () => {
		store.useDataset('espn-actual-2026');
		const idOf = key => store.espnInfo.get(key).espnId;
		store.espn_players = {
			...store.espn_players,
			[idOf('jokicni01')]: { ...store.espn_players[idOf('jokicni01')], injury: 'OUT' },
			[idOf('jamesle01')]: { ...store.espn_players[idOf('jamesle01')], injury: 'DAY_TO_DAY' }
		};
		const page = mountWith(Scores);
		const row = name => page.findAll('tbody tr').find(tr => tr.text().includes(name));
		expect(row('Nikola Jokic').find('td.pin.left-40 span').text()).toBe('OUT');
		expect(row('LeBron James').find('td.pin.left-40 span').text()).toBe('DTD');
		expect(row('Russell Westbrook').find('td.pin.left-40 span').exists()).toBe(false);
	});

	it('uses ESPN eligibility on the roster as fixed positions', () => {
		store.addToList({ list: 'my_team', key: 'jamesle01' });
		const card = mountWith(RosterCard);
		const row = card.findAll('tbody tr').find(tr => tr.text().includes('LeBron'));
		const chip = position => row.findAll('button').find(b => b.text() === position);
		expect(chip('PF').attributes('disabled')).toBeDefined();
		expect(chip('PF').attributes('title')).toBe('Eligible on ESPN');
		expect(chip('PG').attributes('disabled')).toBeUndefined();
		expect(store.rosterPlayers[0].positions).toEqual(['SF', 'PF']);
	});

	it('weights FT% by attempts by default and explains it on hover', () => {
		store.useDataset('espn-actual-2026');
		const ft = store.columns.indexOf('FT%');
		expect(store.weightedPercentColumns).toEqual([store.columns.indexOf('FG%'), ft]);
		const jokic = () => store.scores.find(score => score.playerKey === 'jokicni01').scoreData[ft];
		const weighted = jokic();

		const row = store.keyRows.get('jokicni01');
		const games = row[store.config.games_column];
		const made = row[store.columns.indexOf('FT')] / games;
		const attempts = row[store.columns.indexOf('FTA')] / games;
		const baseline = store.column_averages[ft];
		expect(weighted).toBeCloseTo(1 + (made - baseline.percentage * attempts) / (baseline.percentage * baseline.attempts), 3);

		const page = mountWith(Scores);
		expect(page.text()).toContain('FG%, FT% are weighted by attempts');
		const cell = page.findAll('tbody tr').find(tr => tr.text().includes('Nikola Jokic')).findAll('td').find(td => (td.attributes('title') || '').includes('FTA/game'));
		expect(cell.attributes('title')).toContain(`${attempts.toFixed(1)} FTA/game at ${(made / attempts * 100).toFixed(1)}%`);

		store.changeConfigSetting({ config_key: 'weight_percentages', config_value: false });
		expect(store.weightedPercentColumns).toEqual([]);
		expect(jokic()).not.toBe(weighted);
		store.changeConfigSetting({ config_key: 'weight_percentages', config_value: true });
	});

	it('filters and shows positions by ESPN eligibility, and finds players for open slots', async () => {
		store.useDataset('espn-actual-2026');
		const eligible = key => store.espnInfo.get(key)?.eligible || [];
		// Someone listed at SF that ESPN also lets play PF (Ronald Holland II)
		const dual = store.scores.find(score => score.playerPosition !== 'PF' && eligible(score.playerKey).includes('PF'));
		expect(dual).toBeDefined();

		store.changeActivePosition('PF');
		expect(store.filteredScores.some(score => score.playerKey === dual.playerKey)).toBe(true);
		expect(store.filteredScores.every(score => store.eligiblePositions(score.playerKey).includes('PF'))).toBe(true);
		store.changeActivePosition('all');

		const page = mountWith(Scores);
		const row = page.findAll('tbody tr').find(tr => tr.text().includes(dual.playerName));
		expect(row.findAll('td')[4].text()).toBe('SF, PF');

		// LeBron (SF, PF) is on My Team: with SF and C slots, only C is open
		store.changeConfigSetting({ config_key: 'roster_slots', config_value: ['SF', 'C', 'Bench'] });
		store.changeFitsOpenSlots(true);
		expect(store.openStarterSlots).toEqual([{ slot: 'C', count: 1 }]);
		expect(store.filteredScores.map(score => score.playerName).sort()).toEqual(['Nikola Jokic', 'Victor Wembanyama']);
		expect(store.filteredPlayers.length).toBeGreaterThan(0);
		expect(store.filteredPlayers.every(row => store.eligiblePositions(store.rowKeys.get(row)).includes('C') && store.rowKeys.get(row) !== 'jamesle01')).toBe(true);
		await page.vm.$nextTick();
		expect(page.text()).toContain('Open:');

		// A full starting lineup fits nobody
		store.changeConfigSetting({ config_key: 'roster_slots', config_value: ['SF', 'Bench'] });
		expect(store.filteredScores).toEqual([]);
		await page.vm.$nextTick();
		expect(page.text()).toContain('Your starting lineup is full.');
		store.changeFitsOpenSlots(false);
	});
});
