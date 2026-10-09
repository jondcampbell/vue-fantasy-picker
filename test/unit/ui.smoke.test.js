// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import fs from 'node:fs';
import path from 'node:path';
import papaparse from 'papaparse';
import storePlugin, { useStore } from '../../client/store';
import Home from '../../client/views/Home.vue';
import Icon from '../../client/components/Icon.vue';

// Renders every screen against the real sample CSV to catch template/runtime errors
const store = useStore();

describe('UI smoke test', () => {
	const warnings = [];
	let wrapper;

	beforeAll(() => {
		const csv = fs.readFileSync(path.resolve(process.cwd(), 'samplestats.csv'), 'utf8');
		store.changeConfigSetting({ config_key: 'pos_column', config_value: 2 }); // older export format
		store.importPlayers(papaparse.parse(csv).data); // evaluates automatically

		wrapper = mount(Home, {
			global: {
				plugins: [storePlugin],
				components: { icon: Icon },
				config: {
					warnHandler: (msg) => warnings.push(msg),
					errorHandler: (err) => { throw err; }
				}
			}
		});
	});

	afterAll(() => wrapper?.unmount());

	const showScreen = async (screen) => {
		await store.changeScreen(screen);
		await nextTick();
	};

	it('renders the import screen', async () => {
		await showScreen(1);
		expect(wrapper.text()).toContain('Imported CSV');
		expect(wrapper.text()).toContain(`${store.datasets.csv.rows.length} players`);
		expect(wrapper.text()).toContain('Active');
	});

	it('renders the players table', async () => {
		await showScreen(2);
		expect(store.scores.length).toBeGreaterThan(0);
		expect(store.players.length).toBeGreaterThan(300);
		expect(wrapper.findAll('tbody tr').length).toBe(150);
		expect(wrapper.text()).toContain(`Showing 150 of ${store.players.length} players`);
		await wrapper.findAll('button').find(b => b.text() === 'Show 150 more').trigger('click');
		expect(wrapper.findAll('tbody tr').length).toBe(300);
		await wrapper.findAll('button').find(b => b.text() === 'Show all').trigger('click');
		expect(wrapper.findAll('tbody tr').length).toBe(store.players.length);
		expect(wrapper.text()).not.toContain('Showing');
	});

	it('renders rankings with best/worst highlights and the rank-by bar', async () => {
		await showScreen(3);
		await store.changeActiveCategory('total');
		await nextTick();
		const rows = wrapper.findAll('tbody tr');
		expect(rows.length).toBe(Math.min(150, store.scores.length));
		expect(rows[0].find('td').text()).toBe('1');
		expect(wrapper.findAll('td.text-good').length).toBeGreaterThan(0);
		expect(wrapper.findAll('td.text-bad').length).toBeGreaterThan(0);
		// Punt chips (one per league category) plus Rank by: Overall, the categories, then ranking-only
		expect(wrapper.findAll('main .pill').length).toBe(store.keyColumns.length * 2 + 1 + store.config.ranking_only_columns.length);
	});

	it('re-ranks when a category header or pill is clicked', async () => {
		const ptsIndex = store.columns.indexOf('PTS');
		await wrapper.find('th button[title="Rank by PTS"]').trigger('click');
		expect(store.active_category).toBe(ptsIndex);
		expect(wrapper.find('th[aria-sort="descending"]').text()).toBe('PTS');
		const points = store.sortedFilteredPlayerScores.map(p => p.scoreData[ptsIndex]);
		expect(points).toEqual([...points].sort((a, b) => b - a));

		await wrapper.findAll('main .pill').find(pill => pill.text() === 'Overall').trigger('click');
		expect(store.active_category).toBe('total');
		expect(wrapper.find('th[aria-sort="descending"]').text()).toBe('Score');
	});

	it('ranks by ranking-only columns without changing the overall score', async () => {
		const tovIndex = store.columns.indexOf('TOV');
		const totalsBefore = store.scores.map(p => p.scoreData.total);
		const pill = wrapper.findAll('main .pill').find(p => p.text() === 'TOV');
		expect(pill.attributes('title')).toContain('not counted');
		await pill.trigger('click');
		expect(store.active_category).toBe(tovIndex);
		expect(wrapper.find('th[aria-sort="descending"]').text()).toBe('TOV*');
		// Turnovers: fewer is better, so the top-ranked player has the lowest per-game TOV
		const ranked = store.sortedFilteredPlayerScores;
		const perGame = key => store.keyRows.get(key)[tovIndex];
		expect(perGame(ranked[0].playerKey)).toBeLessThanOrEqual(perGame(ranked[ranked.length - 1].playerKey));
		expect(store.scores.map(p => p.scoreData.total)).toEqual(totalsBefore);
		await store.changeActiveCategory('total');
	});

	it('punts a category: out of Overall, still rankable, ranking-only untouched', async () => {
		const ftIndex = store.columns.indexOf('FT%');
		const rankingOnly = [...store.config.ranking_only_columns];
		const totalsBefore = store.scores.map(p => p.scoreData.total);
		const puntPill = () => wrapper.findAll('main nav')[0].findAll('.pill').find(p => p.text() === 'FT%');

		await puntPill().trigger('click');
		expect(store.config.punt_columns).toEqual([ftIndex]);
		expect(puntPill().attributes('aria-pressed')).toBe('true');
		expect(store.scores.map(p => p.scoreData.total)).not.toEqual(totalsBefore);
		expect(store.config.ranking_only_columns).toEqual(rankingOnly);
		expect(wrapper.find('th button[title="Rank by FT% (not counted in Overall)"]').text()).toBe('FT%*');

		// The last category left in Overall can't be punted
		store.changeConfigSetting({ config_key: 'punt_columns', config_value: [] });
		const puntable = store.keyColumns.length;
		store.config.key_columns.filter(column => !rankingOnly.includes(column)).forEach(column => store.togglePunt(column));
		expect(store.config.punt_columns.length).toBe(puntable - 1);

		await nextTick();
		await wrapper.findAll('button').find(b => b.text() === 'Clear punts').trigger('click');
		expect(store.config.punt_columns).toEqual([]);
		expect(store.scores.map(p => p.scoreData.total)).toEqual(totalsBefore);
	});

	it('toggles a player onto my team from the table', async () => {
		const firstId = store.sortedFilteredPlayerScores[0].playerKey;
		await wrapper.find('tbody tr button[title="Add to my team"]').trigger('click');
		expect(store.my_team).toContain(firstId);
		await showScreen(6);
		expect(wrapper.findAll('.table-wrap tbody tr').length).toBe(1);
		expect(wrapper.find('aside').text()).toContain('My Team · 1');
	});

	it('fills roster slots and edits eligibility and IR', async () => {
		const roster = () => wrapper.find('section.card table');
		const rowFor = name => roster().findAll('tbody tr').find(tr => tr.text().includes(name));
		const player = store.rosterPlayers[0];

		// One player: seated in their own position's slot, everything else open
		expect(roster().findAll('tbody tr').length).toBe(store.config.roster_slots.length);
		expect(rowFor(player.name).find('td').text()).toBe(player.position);
		expect(wrapper.find('aside').text()).toContain('UTIL ×3');

		// Mark them eligible at another position, then move them to IR
		const other = ['PG', 'SG', 'SF', 'PF', 'C'].find(position => position !== player.position);
		await rowFor(player.name).findAll('button').find(b => b.text() === other).trigger('click');
		expect(store.position_overrides[player.key]).toEqual([other]);
		expect(store.rosterPlayers[0].positions).toContain(other);

		await rowFor(player.name).findAll('button').find(b => b.text() === 'IR').trigger('click');
		expect(rowFor(player.name).find('td').text()).toBe('IR');
		await rowFor(player.name).findAll('button').find(b => b.text() === 'IR').trigger('click');
		expect(rowFor(player.name).find('td').text()).toBe(player.position);
	});

	it('renders the watch list empty state', async () => {
		await showScreen(5);
		expect(wrapper.text()).toContain('Nobody on your watch list yet');
	});

	it('renders the configure screen', async () => {
		await showScreen(4);
		expect(wrapper.findAll('select[multiple]').length).toBe(4);
	});

	it('edits roster slots and rejects unknown ones', async () => {
		const input = () => wrapper.find('input[type="text"]');
		await input().setValue('PG, QB, Bench');
		await input().trigger('change');
		expect(wrapper.text()).toContain('Unknown slot: QB');
		expect(store.config.roster_slots.length).toBe(15);

		await input().setValue('pg, sg, util, bench');
		await input().trigger('change');
		expect(store.config.roster_slots).toEqual(['PG', 'SG', 'UTIL', 'Bench']);
		expect(input().element.value).toBe('PG, SG, UTIL, Bench');

		await input().setValue('PG, SG, SF, PF, C, G, F, UTIL, UTIL, UTIL, Bench, Bench, Bench, Bench, IR');
		await input().trigger('change');
		expect(store.config.roster_slots.length).toBe(15);
	});

	it('re-scores on valid setting changes and ignores invalid numbers', async () => {
		const input = () => wrapper.find('label:has(input[type="number"][min="0"]) input');
		const scoredBefore = store.scores.length;

		await input().setValue('');
		expect(store.config.min_games_played).toBe(10);
		await input().setValue('-3');
		expect(store.config.min_games_played).toBe(10);
		await input().trigger('blur');
		expect(input().element.value).toBe('10');

		await input().setValue('60');
		expect(store.config.min_games_played).toBe(60);
		expect(store.scores.length).toBeLessThan(scoredBefore);
		await input().setValue('10');
		expect(store.scores.length).toBe(scoredBefore);
	});

	it('switches and remembers the light/dark theme', async () => {
		const button = label => wrapper.find(`header button[title="${label}"]`);
		await button('Dark').trigger('click');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(window.localStorage.getItem('theme')).toBe('dark');
		expect(button('Dark').attributes('aria-checked')).toBe('true');

		await button('Light').trigger('click');
		expect(document.documentElement.dataset.theme).toBe('light');

		await button('Match system').trigger('click');
		expect(document.documentElement.dataset.theme).toBeUndefined();
		expect(window.localStorage.getItem('theme')).toBeNull();
	});

	it('produced no Vue warnings', () => {
		expect(warnings).toEqual([]);
	});
});
