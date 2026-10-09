// Persists the whole store to localStorage. Keeps the key the old Vuex/vuex-persist setup used, so saved data carries over.
// Saved values replace defaults wholesale; settings missing from saved state fall back to defaults.

import { roundFloat } from './scoring'
import { detectKeyColumn, computeKeys } from './identity'

export const STORAGE_KEY = 'vuex';

// Build the state to restore from the store defaults and whatever was saved
export const restoreState = function(defaults, saved) {
	if (!saved || typeof saved !== 'object') {
		return defaults;
	}

	const state = { ...defaults, ...saved, config: { ...defaults.config, ...(saved.config || {}) } };

	// Numeric settings saved as null (NaN from an emptied input) or garbage fall back to the default
	Object.keys(defaults.config).forEach(key => {
		if (typeof defaults.config[key] === 'number' && !Number.isFinite(state.config[key])) {
			state.config[key] = defaults.config[key];
		}
	});

	// Saved before ranking-only columns existed: their season totals (BLK, TOV) were never converted
	// to per-game, so convert them now instead of forcing a re-import (which clears the lists)
	if (saved.config && !('ranking_only_columns' in saved.config)) {
		const config = state.config;
		const newTotals = defaults.config.yearly_total_columns.filter(column => {
			return config.ranking_only_columns.includes(column) && !config.yearly_total_columns.includes(column);
		});

		if (newTotals.length > 0) {
			config.yearly_total_columns = [...config.yearly_total_columns, ...newTotals];
			state.players = (state.players || []).map(player => {
				const updated = player.slice();
				const games = Number(updated[config.games_column]) || 0;
				newTotals.forEach(column => {
					const total = Number(updated[column]) || 0;
					updated[column] = games > 0 ? roundFloat(total / games, 4) : 0;
				});
				return updated;
			});
		}
	}

	// Saved before stable player keys: detect the ID column and convert lists from CSV rank numbers to keys
	if (saved.config && !('key_column' in saved.config)) {
		migrateListsToKeys(state);
	}

	// Saved before datasets: keep the loaded players as the "Imported CSV" dataset. Those rows were
	// already converted to per-game, so the dataset is flagged to skip that step when re-loaded.
	if (!('datasets' in saved) && (state.players || []).length > 0) {
		state.datasets = {
			csv: { id: 'csv', label: 'Imported CSV', kind: 'actual', season: null, source: 'CSV', fetchedAt: null, columns: state.columns, rows: state.players, normalized: true }
		};
		state.active_dataset = 'csv';
	}

	return state;
};

const migrateListsToKeys = function(state) {
	const config = state.config;
	const columns = state.columns || [];
	const players = state.players || [];
	config.key_column = detectKeyColumn(columns);

	// Old lists stored row[id_column] (the CSV rank, coerced to a number)
	const keyForId = new Map();
	computeKeys(players, columns, config).forEach((key, row) => {
		keyForId.set(Number(row[config.id_column]), { key, name: row[config.name_column] });
	});
	const names = {};
	const convert = function(ids) {
		return (ids || []).map(id => keyForId.get(Number(id))).filter(Boolean).map(({ key, name }) => {
			names[key] = name;
			return key;
		});
	};

	state.my_team = convert(state.my_team);
	state.taken_players = convert(state.taken_players);
	state.watch_list = convert(state.watch_list);
	state.ir_players = convert(state.ir_players);
	const overrides = {};
	Object.entries(state.position_overrides || {}).forEach(([id, positions]) => {
		const match = keyForId.get(Number(id));
		if (match) {
			overrides[match.key] = positions;
		}
	});
	state.position_overrides = overrides;
	state.list_names = names;
};

const readSaved = function() {
	try {
		return JSON.parse(window.localStorage.getItem(STORAGE_KEY));
	} catch (e) {
		return null;
	}
};

const writeState = function(state) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (e) {
		// Storage unavailable or full; the app keeps working without persistence
	}
};

// Restore saved state into a Pinia store, then save after every change
export const persist = function(store) {
	if (typeof window === 'undefined' || !window.localStorage) {
		return;
	}

	store.$state = restoreState(store.$state, readSaved());

	// $subscribe batches changes per tick, so a burst of updates writes once
	store.$subscribe((mutation, state) => writeState(state), { detached: true });
};
