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

	it('loads state saved by the old Vuex setup', () => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
			config: { key_columns: [10, 29], ranking_only_columns: [27], screen: 4 },
			my_team: [3, 8],
			active_category: 29
		}));
		const store = freshStore();
		expect(store.config.key_columns).toEqual([10, 29]);
		expect(store.config.screen).toBe(4);
		expect(store.config.min_games_played).toBe(10);
		expect(store.my_team).toEqual([3, 8]);
		expect(store.isOnTeam(8)).toBe(true);
		expect(store.active_category).toBe(29);
	});

	it('saves changes back to localStorage', async () => {
		const store = freshStore();
		store.addToList({ list: 'watch_list', player_id: '12' });
		store.changeConfigSetting({ config_key: 'key_columns', config_value: [11] });
		await nextTick();
		const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
		expect(saved.watch_list).toEqual([12]);
		expect(saved.config.key_columns).toEqual([11]);
	});

	it('starts from defaults when storage is empty or corrupt', () => {
		window.localStorage.setItem(STORAGE_KEY, '{not json');
		const store = freshStore();
		expect(store.config.screen).toBe(1);
		expect(store.players).toEqual([]);
	});
});
