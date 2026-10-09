// Pure scoring helpers used by the store. Kept free of Vuex so they can be unit tested.

export const AVERAGE_MODE_MEAN = 1;
export const AVERAGE_MODE_MEDIAN = 2;

export const roundFloat = function(value, decimals) {
	return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

const toValue = function(value) {
	const n = parseFloat(value);
	return isNaN(n) ? 0 : n;
};

export const meetsMinimums = function(player, config) {
	const games = player[config.games_column];
	const meets_min_games = games >= config.min_games_played;
	const meets_min_minutes = (player[config.minutes_column] / games) >= config.min_minutes_played;
	return meets_min_games && meets_min_minutes;
};

const mean = function(values) {
	const sum = values.reduce((total, value) => total + value, 0);
	return sum / values.length;
};

const median = function(values) {
	const sorted = values.slice().sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2) {
		return sorted[middle];
	}
	return (sorted[middle - 1] + sorted[middle]) / 2;
};

// How many of the best qualifying players form a category baseline
const poolSize = function(config, available) {
	const pool = config.average_pool_size;
	if (typeof pool === 'number') {
		return Math.min(pool, available);
	}
	if (pool === 'all') {
		return available;
	}
	// Fallback to legacy behavior if not set: every rostered player in the league
	return Math.min(config.teams_in_league * config.players_per_team, available);
};

// Baseline value for a category: the mean (or median) of the best players who meet the minimums
export const categoryAverage = function(players, category, config) {
	const isNegative = config.negative_columns.includes(category);

	const sortedPlayers = players
		.filter(player => meetsMinimums(player, config))
		.sort(function(a, b) {
			return isNegative ? a[category] - b[category] : b[category] - a[category];
		});

	const values = sortedPlayers
		.slice(0, poolSize(config, sortedPlayers.length))
		.map(player => toValue(player[category]));

	if (values.length === 0) {
		return 0;
	}

	const average = config.average_mode === AVERAGE_MODE_MEDIAN ? median(values) : mean(values);
	return roundFloat(average, 4);
};

// Score a single category relative to its baseline: 1.0 is average, higher is always better.
// Lower-is-better categories mirror around 1.0 so they carry the same weight as the others.
export const categoryScore = function(value, average, isNegative) {
	if (!average) {
		return 0;
	}
	const ratio = toValue(value) / average;
	return roundFloat(isNegative ? 2 - ratio : ratio, 4);
};

// Percentage categories that can be weighted by attempts: header -> [makes header, attempts header]
const PERCENT_PARTS = { 'FG%': ['FG', 'FGA'], 'FT%': ['FT', 'FTA'], '3P%': ['3P', '3PA'] };

// Percentage column index -> { made, attempts } column indexes, for those whose makes and attempts columns exist
export const percentageParts = function(columns) {
	const parts = {};
	Object.entries(PERCENT_PARTS).forEach(([header, [madeHeader, attemptsHeader]]) => {
		const column = columns.indexOf(header);
		const made = columns.indexOf(madeHeader);
		const attempts = columns.indexOf(attemptsHeader);
		if (column >= 0 && made >= 0 && attempts >= 0) {
			parts[column] = { made, attempts };
		}
	});
	return parts;
};

// Per-game value of a column: makes and attempts are season totals unless listed in Season Totals
// (those were already converted to per-game on import)
export const perGame = function(player, column, config) {
	const value = toValue(player[column]);
	if ((config.yearly_total_columns || []).includes(column)) {
		return value;
	}
	const games = toValue(player[config.games_column]);
	return games > 0 ? value / games : 0;
};

/**
 * Baseline for a percentage weighted by attempts, over the same pool as other categories (the qualifying
 * players with the most attempts when a pool size is set): the league percentage (total makes / total
 * attempts) and the mean (or median) attempts per game, plus the makes/attempts column indexes. null when nobody in the pool has attempts.
 */
export const percentageBaseline = function(players, parts, config) {
	const shooters = players
		.filter(player => meetsMinimums(player, config))
		.map(player => ({ made: perGame(player, parts.made, config), attempts: perGame(player, parts.attempts, config) }))
		.sort((a, b) => b.attempts - a.attempts);
	const pool = shooters.slice(0, poolSize(config, shooters.length));
	const made = pool.reduce((total, shooter) => total + shooter.made, 0);
	const attempts = pool.map(shooter => shooter.attempts);
	const totalAttempts = attempts.reduce((total, value) => total + value, 0);
	if (totalAttempts === 0) {
		return null;
	}
	return {
		made: parts.made,
		attemptsColumn: parts.attempts,
		percentage: roundFloat(made / totalAttempts, 4),
		attempts: roundFloat(config.average_mode === AVERAGE_MODE_MEDIAN ? median(attempts) : mean(attempts), 4)
	};
};

// Extra makes over an average shooter on the same attempts, relative to an average player's makes:
// 1.0 is average, and volume counts (90% on 8 attempts beats 90% on 1; 60% on 8 can drop below 0)
export const weightedPercentageScore = function(made, attempts, baseline) {
	const averageMade = baseline.percentage * baseline.attempts;
	if (!averageMade) {
		return 0;
	}
	return roundFloat(1 + (made - baseline.percentage * attempts) / averageMade, 4);
};

// Every column that gets a score: the key categories plus ranking-only columns, in column order
export const scoredColumns = function(config) {
	const columns = new Set([...config.key_columns, ...(config.ranking_only_columns || [])]);
	return [...columns].sort((a, b) => a - b);
};

// Scoring categories that can count in the overall score: everything but ranking-only. Ranking-only always
// wins, so you can ignore a league category (e.g. BLK, TO) in your own rankings while still ranking by it.
export const puntableColumns = function(config) {
	const rankingOnly = config.ranking_only_columns || [];
	return config.key_columns.filter(column => !rankingOnly.includes(column));
};

// Columns averaged into the overall score: puntable categories you aren't currently punting
export const overallColumns = function(config) {
	const punted = config.punt_columns || [];
	return puntableColumns(config).filter(column => !punted.includes(column));
};

/**
 * Baseline per scored column: a number (mean/median of the category), or for FG%, FT% and 3P% with
 * config.weight_percentages on and makes/attempts columns present, a weighted baseline object
 * { made, attemptsColumn (column indexes), percentage, attempts (league averages) } from percentageBaseline().
 */
export const categoryBaselines = function(players, columns, config) {
	const parts = config.weight_percentages ? percentageParts(columns) : {};
	const baselines = {};
	scoredColumns(config).forEach(column => {
		const weighted = parts[column] && percentageBaseline(players, parts[column], config);
		baselines[column] = weighted || categoryAverage(players, column, config);
	});
	return baselines;
};

// Columns scored by attempts-weighted percentage under these baselines
export const weightedColumns = function(baselines) {
	return Object.keys(baselines).filter(column => typeof baselines[column] === 'object' && baselines[column] !== null).map(Number);
};

// Scores every scored column; the total only averages the overall columns
export const playerRanking = function(player, config, columnAverages) {
	const rankings = {};
	let rankingsSum = 0;

	scoredColumns(config).forEach(function(column) {
		const baseline = columnAverages[column];
		if (typeof baseline === 'object' && baseline !== null) {
			rankings[column] = weightedPercentageScore(perGame(player, baseline.made, config), perGame(player, baseline.attemptsColumn, config), baseline);
			return;
		}
		const isNegative = config.negative_columns.includes(column);
		rankings[column] = categoryScore(player[column], baseline, isNegative);
	});

	const overall = overallColumns(config);
	overall.forEach(function(column) {
		rankingsSum = rankingsSum + rankings[column];
	});

	rankings.total = overall.length > 0 ? roundFloat(rankingsSum / overall.length, 4) : 0;
	return rankings;
};

// Number of key categories where the player beats the baseline (score above 1.0)
export const countAboveAverage = function(scoreData, keyColumns) {
	return keyColumns.filter(column => scoreData[column] > 1).length;
};
