// Turns raw dataset rows (CSV or API, Basketball-Reference totals layout) into the player rows the app
// scores: one row per player, clean names, numeric stats, season totals converted to per-game.
// Pure: rows are copied, never mutated, so stored datasets can be re-loaded any time.

import { roundFloat, scoredColumns } from './scoring';
import { dedupeKey } from './identity';

const toNumber = function(value) {
	if (value === '' || value === null || typeof value === 'undefined') return 0;
	const n = Number(value);
	return isNaN(n) ? 0 : n;
};

// perGame: false for rows saved before datasets existed, which were already converted
export const normalizeRows = function(rows, config, { perGame = true } = {}) {
	const nameColumn = config.name_column;
	const gamesCol = config.games_column;
	const minutesCol = config.minutes_column;
	const numericCols = [...scoredColumns(config), ...config.yearly_total_columns];
	const totalCols = config.yearly_total_columns;
	const cleanPlayers = [];
	const seen = new Set();

	rows.forEach(function(row) {
		// Skip blank lines (e.g. a trailing newline in the CSV)
		if (!row[nameColumn]) {
			return;
		}

		// The same player can appear on several rows (e.g. traded); keep the first
		const identity = dedupeKey(row, config);
		if (seen.has(identity)) {
			return;
		}
		seen.add(identity);

		const player = row.slice();

		// Old Basketball-Reference exports append "\playerid" to names
		if (typeof player[nameColumn] === 'string') {
			const junk = player[nameColumn].indexOf('\\');
			player[nameColumn] = (junk >= 0 ? player[nameColumn].substring(0, junk) : player[nameColumn]).trim();
		}

		// Coerce core numeric fields once
		player[gamesCol] = toNumber(player[gamesCol]);
		player[minutesCol] = toNumber(player[minutesCol]);
		numericCols.forEach(col => { player[col] = toNumber(player[col]); });

		// Adjust the yearly totals to per-game safely
		if (perGame) {
			const gamesPlayed = player[gamesCol];
			totalCols.forEach(function(column) {
				player[column] = gamesPlayed > 0 ? roundFloat(player[column] / gamesPlayed, 4) : 0;
			});
		}
		cleanPlayers.push(player);
	});

	return cleanPlayers;
};
