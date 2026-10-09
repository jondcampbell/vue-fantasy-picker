import { describe, it, expect } from 'vitest';
import { restoreState } from '../../client/store/persist';

// Columns: 0 id, 1 name, 2 games, 3 BLK (season total until converted), 4 TOV, 5 PTS
const defaults = () => ({
	config: {
		games_column: 2,
		key_columns: [5],
		yearly_total_columns: [3, 4, 5],
		ranking_only_columns: [3, 4],
		min_games_played: 10
	},
	players: [],
	my_team: [],
	watch_list: []
});

describe('restoreState', () => {
	it('returns the defaults when nothing was saved', () => {
		const state = defaults();
		expect(restoreState(state, null)).toBe(state);
	});

	it('replaces saved arrays wholesale instead of merging by index', () => {
		const saved = { config: { key_columns: [9], yearly_total_columns: [3, 4, 5], ranking_only_columns: [], key_column: null }, my_team: ['abc01'] };
		const state = restoreState(defaults(), saved);
		expect(state.config.key_columns).toEqual([9]);
		expect(state.config.ranking_only_columns).toEqual([]);
		expect(state.my_team).toEqual(['abc01']);
	});

	it('drops the removed Top Players setting', () => {
		const saved = { config: { top_players: 5, ranking_only_columns: [3], yearly_total_columns: [3, 4, 5] } };
		expect('top_players' in restoreState(defaults(), saved).config).toBe(false);
	});

	it('fills settings missing from saved state with defaults', () => {
		const saved = { config: { key_columns: [5], yearly_total_columns: [3, 4, 5], ranking_only_columns: [3] } };
		expect(restoreState(defaults(), saved).config.min_games_played).toBe(10);
	});

	it('replaces invalid saved numbers with the defaults', () => {
		const saved = { config: { min_games_played: null, ranking_only_columns: [], yearly_total_columns: [5] } };
		expect(restoreState(defaults(), saved).config.min_games_played).toBe(10);
		saved.config.min_games_played = 'abc';
		expect(restoreState(defaults(), saved).config.min_games_played).toBe(10);
		saved.config.min_games_played = 0;
		expect(restoreState(defaults(), saved).config.min_games_played).toBe(0);
	});

	it('migrates pre-ranking-only state: adds the per-game conversion and converts loaded players', () => {
		const saved = {
			config: { games_column: 2, key_columns: [5], yearly_total_columns: [5], key_column: null },
			players: [
				[1, 'A', 20, '40', '30', 25],
				[2, 'B', 0, '5', '1', 0]
			],
			my_team: ['abc01']
		};
		const state = restoreState(defaults(), saved);
		expect(state.config.yearly_total_columns).toEqual([5, 3, 4]);
		expect(state.config.ranking_only_columns).toEqual([3, 4]);
		expect(state.players[0]).toEqual([1, 'A', 20, 2, 1.5, 25]);
		expect(state.players[1]).toEqual([2, 'B', 0, 0, 0, 0]);
		expect(state.my_team).toEqual(['abc01']);
		// Saved player arrays are not mutated
		expect(saved.players[0][3]).toBe('40');
	});

	it('does not migrate again once ranking-only columns are saved', () => {
		const saved = {
			config: { games_column: 2, key_columns: [5], yearly_total_columns: [5], ranking_only_columns: [3, 4] },
			players: [[1, 'A', 20, 2, 1.5, 25]]
		};
		const state = restoreState(defaults(), saved);
		expect(state.config.yearly_total_columns).toEqual([5]);
		expect(state.players[0]).toEqual([1, 'A', 20, 2, 1.5, 25]);
	});
});
