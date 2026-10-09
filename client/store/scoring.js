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

// Baseline value for a category: the mean (or median) of the best players who meet the minimums
export const categoryAverage = function(players, category, config) {
	const isNegative = config.negative_columns.includes(category);

	const sortedPlayers = players
		.filter(player => meetsMinimums(player, config))
		.sort(function(a, b) {
			return isNegative ? a[category] - b[category] : b[category] - a[category];
		});

	// Determine the pool size for averaging
	const pool = config.average_pool_size;
	let numberOfPlayers;
	if (typeof pool === 'number') {
		numberOfPlayers = pool;
	} else if (pool === 'all') {
		numberOfPlayers = sortedPlayers.length;
	} else {
		// Fallback to legacy behavior if not set: every rostered player in the league
		numberOfPlayers = config.teams_in_league * config.players_per_team;
	}

	const values = sortedPlayers
		.slice(0, Math.min(numberOfPlayers, sortedPlayers.length))
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

export const playerRanking = function(player, config, columnAverages) {
	const rankings = {};
	let rankingsSum = 0;

	config.key_columns.forEach(function(column) {
		const isNegative = config.negative_columns.includes(column);
		const columnScore = categoryScore(player[column], columnAverages[column], isNegative);
		rankings[column] = columnScore;
		rankingsSum = rankingsSum + columnScore;
	});

	rankings.total = roundFloat(rankingsSum / config.key_columns.length, 4);
	return rankings;
};

// Number of key categories where the player beats the baseline (score above 1.0)
export const countAboveAverage = function(scoreData, keyColumns) {
	return keyColumns.filter(column => scoreData[column] > 1).length;
};
