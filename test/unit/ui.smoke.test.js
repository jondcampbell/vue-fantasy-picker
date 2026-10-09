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
		store.importPlayers(papaparse.parse(csv).data);
		store.evaluatePlayers();

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
		expect(wrapper.text()).toContain('players currently loaded');
	});

	it('renders the players table', async () => {
		await showScreen(2);
		expect(wrapper.findAll('tbody tr').length).toBe(store.players.length);
	});

	it('renders rankings with best/worst highlights and the rank-by bar', async () => {
		await showScreen(3);
		await store.changeActiveCategory('total');
		await nextTick();
		const rows = wrapper.findAll('tbody tr');
		expect(rows.length).toBe(store.scores.length);
		expect(rows[0].find('td').text()).toBe('1');
		expect(wrapper.findAll('td.text-good').length).toBeGreaterThan(0);
		expect(wrapper.findAll('td.text-bad').length).toBeGreaterThan(0);
		expect(wrapper.findAll('main .pill').length).toBe(store.keyColumns.length + 1 + store.config.ranking_only_columns.length);
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
		const perGame = id => store.players.find(p => p[0] === id)[tovIndex];
		expect(perGame(ranked[0].playerId)).toBeLessThanOrEqual(perGame(ranked[ranked.length - 1].playerId));
		expect(store.scores.map(p => p.scoreData.total)).toEqual(totalsBefore);
		await store.changeActiveCategory('total');
	});

	it('toggles a player onto my team from the table', async () => {
		const firstId = store.sortedFilteredPlayerScores[0].playerId;
		await wrapper.find('tbody tr button[title="Add to my team"]').trigger('click');
		expect(store.my_team).toContain(firstId);
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
