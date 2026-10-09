// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia } from 'pinia';
import { nextTick } from 'vue';
import { usePickerStore } from '../../client/store';
import { persist, STORAGE_KEY } from '../../client/store/persist';

const freshStore = () => {
	const store = usePickerStore(createPinia());
	persist(store);
	return store;
};

describe('persist with the Pinia store', () => {
	beforeEach(() => window.localStorage.clear());

	it('loads state saved by the old Vuex setup, converting rank-based lists to player keys', () => {
		const row = (rank, name, id) => [rank, name, 30, 'BOS', 'PG', 60, 60, 1800, 0, 0, 0.45, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 5, 4, 1, 0.5, 2, 2, 20, 0, '', id];
		const columns = row('Rk', 'Player', 'Player-additional');
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
			config: { key_columns: [10, 29], ranking_only_columns: [27], screen: 4 },
			columns: columns,
			players: [row(3, 'Nikola Jokić', 'jokicni01'), row(8, 'Jaren Jackson Jr.', 'jacksja02')],
			my_team: [3, 8],
			watch_list: [8, 99],
			position_overrides: { 8: ['C'] },
			active_category: 29
		}));
		const store = freshStore();
		expect(store.config.key_columns).toEqual([10, 29]);
		expect(store.config.screen).toBe(4);
		expect(store.config.min_games_played).toBe(10);
		expect(store.config.key_column).toBe(32);
		expect(store.my_team).toEqual(['jokicni01', 'jacksja02']);
		expect(store.watch_list).toEqual(['jacksja02']);
		expect(store.position_overrides).toEqual({ jacksja02: ['C'] });
		expect(store.list_names.jokicni01).toBe('Nikola Jokić');
		expect(store.isOnTeam('jacksja02')).toBe(true);
		expect(store.active_category).toBe(29);
	});

	it('saves changes back to localStorage', async () => {
		const store = freshStore();
		store.addToList({ list: 'watch_list', key: 'jokicni01' });
		store.changeConfigSetting({ config_key: 'key_columns', config_value: [11] });
		await nextTick();
		const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
		expect(saved.watch_list).toEqual(['jokicni01']);
		expect(saved.config.key_columns).toEqual([11]);
	});

	it('starts from defaults when storage is empty or corrupt', () => {
		window.localStorage.setItem(STORAGE_KEY, '{not json');
		const store = freshStore();
		expect(store.config.screen).toBe(1);
		expect(store.players).toEqual([]);
	});
});
