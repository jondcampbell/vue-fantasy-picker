// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import fs from 'node:fs';
import path from 'node:path';
import papaparse from 'papaparse';
import store from '../../client/store';
import Home from '../../client/views/Home.vue';
import Icon from '../../client/components/Icon.vue';

// Renders every screen against the real sample CSV to catch template/runtime errors
describe('UI smoke test', () => {
	const warnings = [];
	let wrapper;

	beforeAll(() => {
		const csv = fs.readFileSync(path.resolve(process.cwd(), 'samplestats.csv'), 'utf8');
		store.dispatch('changeConfigSetting', { config_key: 'pos_column', config_value: 2 }); // older export format
		store.dispatch('importPlayers', papaparse.parse(csv).data);
		store.dispatch('evaluatePlayers');

		wrapper = mount(Home, {
			global: {
				plugins: [store],
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
		await store.dispatch('changeScreen', screen);
		await nextTick();
	};

	it('renders the import screen', async () => {
		await showScreen(1);
		expect(wrapper.text()).toContain('players currently loaded');
	});

	it('renders the players table', async () => {
		await showScreen(2);
		expect(wrapper.findAll('tbody tr').length).toBe(store.state.players.length);
	});

	it('renders rankings with best/worst highlights and the rank-by bar', async () => {
		await showScreen(3);
		await store.dispatch('changeActiveCategory', 'total');
		await nextTick();
		const rows = wrapper.findAll('tbody tr');
		expect(rows.length).toBe(store.state.scores.length);
		expect(rows[0].find('td').text()).toBe('1');
		expect(wrapper.findAll('td.text-good').length).toBeGreaterThan(0);
		expect(wrapper.findAll('td.text-bad').length).toBeGreaterThan(0);
		expect(wrapper.findAll('main .pill').length).toBe(store.getters.keyColumns.length + 1 + store.state.config.ranking_only_columns.length);
	});

	it('re-ranks when a category header or pill is clicked', async () => {
		const ptsIndex = store.state.columns.indexOf('PTS');
		await wrapper.find('th button[title="Rank by PTS"]').trigger('click');
		expect(store.state.active_category).toBe(ptsIndex);
		expect(wrapper.find('th[aria-sort="descending"]').text()).toBe('PTS');
		const points = store.getters.sortedFilteredPlayerScores.map(p => p.scoreData[ptsIndex]);
		expect(points).toEqual([...points].sort((a, b) => b - a));

		await wrapper.findAll('main .pill').find(pill => pill.text() === 'Overall').trigger('click');
		expect(store.state.active_category).toBe('total');
		expect(wrapper.find('th[aria-sort="descending"]').text()).toBe('Score');
	});

	it('ranks by ranking-only columns without changing the overall score', async () => {
		const tovIndex = store.state.columns.indexOf('TOV');
		const totalsBefore = store.state.scores.map(p => p.scoreData.total);
		const pill = wrapper.findAll('main .pill').find(p => p.text() === 'TOV');
		expect(pill.attributes('title')).toContain('not counted');
		await pill.trigger('click');
		expect(store.state.active_category).toBe(tovIndex);
		expect(wrapper.find('th[aria-sort="descending"]').text()).toBe('TOV*');
		// Turnovers: fewer is better, so the top-ranked player has the lowest per-game TOV
		const ranked = store.getters.sortedFilteredPlayerScores;
		const perGame = id => store.state.players.find(p => p[0] === id)[tovIndex];
		expect(perGame(ranked[0].playerId)).toBeLessThanOrEqual(perGame(ranked[ranked.length - 1].playerId));
		expect(store.state.scores.map(p => p.scoreData.total)).toEqual(totalsBefore);
		await store.dispatch('changeActiveCategory', 'total');
	});

	it('toggles a player onto my team from the table', async () => {
		const firstId = store.getters.sortedFilteredPlayerScores[0].playerId;
		await wrapper.find('tbody tr button[title="Add to my team"]').trigger('click');
		expect(store.state.my_team).toContain(firstId);
		await showScreen(6);
		expect(wrapper.findAll('tbody tr').length).toBe(1);
		expect(wrapper.find('aside').text()).toContain('My Team · 1');
	});

	it('renders the watch list empty state', async () => {
		await showScreen(5);
		expect(wrapper.text()).toContain('Nobody on your watch list yet');
	});

	it('renders the configure screen', async () => {
		await showScreen(4);
		expect(wrapper.findAll('select[multiple]').length).toBe(4);
	});

	it('produced no Vue warnings', () => {
		expect(warnings).toEqual([]);
	});
});
