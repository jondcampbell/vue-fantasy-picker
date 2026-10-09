// Persists the whole store to localStorage (same key vuex-persist used, so saved data carries over).
// Saved values replace defaults wholesale; settings missing from saved state fall back to defaults.

import { roundFloat } from './scoring'

export const STORAGE_KEY = 'vuex';

// Build the state to restore from the store defaults and whatever was saved
export const restoreState = function(defaults, saved) {
	if (!saved || typeof saved !== 'object') {
		return defaults;
	}

	const state = { ...defaults, ...saved, config: { ...defaults.config, ...(saved.config || {}) } };

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

	return state;
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

export const persistPlugin = function(store) {
	if (typeof window === 'undefined' || !window.localStorage) {
		return;
	}

	store.replaceState(restoreState(store.state, readSaved()));

	// Coalesce saves so a burst of mutations (e.g. evaluating every player) writes once
	let savePending = false;
	store.subscribe((mutation, state) => {
		if (savePending) {
			return;
		}
		savePending = true;
		queueMicrotask(() => {
			savePending = false;
			writeState(state);
		});
	});
};
