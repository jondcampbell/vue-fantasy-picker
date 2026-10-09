import { describe, it, expect } from 'vitest';
import {
	AVERAGE_MODE_MEAN,
	AVERAGE_MODE_MEDIAN,
	meetsMinimums,
	categoryAverage,
	categoryScore,
	playerRanking,
	countAboveAverage,
	scoredColumns,
	overallColumns,
	puntableColumns,
	percentageParts,
	percentageBaseline,
	weightedPercentageScore,
	categoryBaselines,
	weightedColumns
} from '../../client/store/scoring';

// Columns: 0 id, 1 name, 2 games, 3 total minutes, 4 points (per game), 5 turnovers (per game)
const PTS = 4;
const TOV = 5;

const makeConfig = (overrides = {}) => ({
	average_mode: AVERAGE_MODE_MEAN,
	average_pool_size: 'all',
	min_games_played: 10,
	min_minutes_played: 8,
	teams_in_league: 1,
	players_per_team: 2,
	games_column: 2,
	minutes_column: 3,
	key_columns: [PTS, TOV],
	negative_columns: [TOV],
	...overrides
});

const player = (id, pts, tov, games = 20, minutesPerGame = 30) => [id, `Player ${id}`, games, games * minutesPerGame, pts, tov];

const players = [
	player(1, 30, 4),
	player(2, 20, 2),
	player(3, 10, 1),
	player(4, 40, 9),
	player(5, 50, 0, 5), // too few games
	player(6, 50, 0, 20, 4) // too few minutes per game
];

describe('meetsMinimums', () => {
	it('requires both minimum games and minimum minutes per game', () => {
		const config = makeConfig();
		expect(meetsMinimums(players[0], config)).toBe(true);
		expect(meetsMinimums(players[4], config)).toBe(false);
		expect(meetsMinimums(players[5], config)).toBe(false);
	});
});

describe('categoryAverage', () => {
	it('averages only players who meet the minimums', () => {
		expect(categoryAverage(players, PTS, makeConfig())).toBe(25);
	});

	it('uses the top N players for a positive category', () => {
		const config = makeConfig({ average_pool_size: 2 });
		expect(categoryAverage(players, PTS, config)).toBe(35);
	});

	it('uses the lowest N players for a negative category', () => {
		const config = makeConfig({ average_pool_size: 2 });
		expect(categoryAverage(players, TOV, config)).toBe(1.5);
	});

	it('falls back to the league roster size when the pool is unset', () => {
		const config = makeConfig({ average_pool_size: undefined });
		expect(categoryAverage(players, PTS, config)).toBe(35);
	});

	it('never uses more players than are available', () => {
		const config = makeConfig({ average_pool_size: 200 });
		expect(categoryAverage(players, PTS, config)).toBe(25);
	});

	it('uses the median when the average mode is median', () => {
		const config = makeConfig({ average_mode: AVERAGE_MODE_MEDIAN });
		// Valid points: 10, 20, 30, 40 -> median 25; with a pool of 3: 20, 30, 40 -> 30
		expect(categoryAverage(players, PTS, config)).toBe(25);
		expect(categoryAverage(players, PTS, { ...config, average_pool_size: 3 })).toBe(30);
	});

	it('median differs from mean for skewed data', () => {
		const skewed = [player(1, 10, 1), player(2, 12, 1), player(3, 50, 1)];
		expect(categoryAverage(skewed, PTS, makeConfig())).toBe(24);
		expect(categoryAverage(skewed, PTS, makeConfig({ average_mode: AVERAGE_MODE_MEDIAN }))).toBe(12);
	});

	it('returns 0 when no players qualify', () => {
		expect(categoryAverage([players[4]], PTS, makeConfig())).toBe(0);
	});
});

describe('categoryScore', () => {
	it('scores an average player 1.0 in a positive category', () => {
		expect(categoryScore(25, 25, false)).toBe(1);
		expect(categoryScore(50, 25, false)).toBe(2);
	});

	it('scores an average player 1.0 in a negative category, higher is better', () => {
		expect(categoryScore(2, 2, true)).toBe(1);
		expect(categoryScore(0, 2, true)).toBe(2);
		expect(categoryScore(4, 2, true)).toBe(0);
		expect(categoryScore(1, 2, true)).toBeGreaterThan(categoryScore(3, 2, true));
	});

	it('returns 0 instead of Infinity/NaN when the baseline is 0', () => {
		expect(categoryScore(5, 0, false)).toBe(0);
		expect(categoryScore(5, 0, true)).toBe(0);
	});
});

describe('playerRanking', () => {
	it('scores each key column and averages them into a total', () => {
		const config = makeConfig();
		const averages = { [PTS]: 20, [TOV]: 2 };
		const ranking = playerRanking(player(1, 30, 1), config, averages);
		expect(ranking[PTS]).toBe(1.5);
		expect(ranking[TOV]).toBe(1.5);
		expect(ranking.total).toBe(1.5);
	});

	it('gives an all-average player a total of 1.0', () => {
		const averages = { [PTS]: 20, [TOV]: 2 };
		expect(playerRanking(player(1, 20, 2), makeConfig(), averages).total).toBe(1);
	});
});

describe('ranking-only columns', () => {
	const BLK = 6;
	const config = makeConfig({ key_columns: [PTS], ranking_only_columns: [BLK, TOV] });
	const averages = { [PTS]: 20, [TOV]: 2, [BLK]: 1 };

	it('scores key and ranking-only columns in column order without duplicates', () => {
		expect(scoredColumns(config)).toEqual([PTS, TOV, BLK]);
		expect(scoredColumns(makeConfig({ ranking_only_columns: [TOV] }))).toEqual([PTS, TOV]);
		expect(scoredColumns(makeConfig({ ranking_only_columns: undefined }))).toEqual([PTS, TOV]);
	});

	it('scores ranking-only columns but leaves them out of the total', () => {
		const ranking = playerRanking([1, 'P', 20, 600, 30, 1, 3], config, averages);
		expect(ranking[BLK]).toBe(3);
		expect(ranking[TOV]).toBe(1.5);
		expect(ranking.total).toBe(1.5);
	});
});

describe('ranking-only takes precedence over scoring categories', () => {
	it('keeps a scoring category that is also ranking-only out of the total', () => {
		const config = makeConfig({ key_columns: [PTS, TOV], ranking_only_columns: [TOV] });
		expect(overallColumns(config)).toEqual([PTS]);
		const ranking = playerRanking(player(1, 30, 1), config, { [PTS]: 20, [TOV]: 2 });
		expect(ranking[TOV]).toBe(1.5);
		expect(ranking.total).toBe(1.5);
	});

	it('gives a total of 0 when every category is ranking-only', () => {
		const config = makeConfig({ key_columns: [PTS], ranking_only_columns: [PTS] });
		expect(playerRanking(player(1, 30, 1), config, { [PTS]: 20 }).total).toBe(0);
	});
});

describe('countAboveAverage', () => {
	it('counts categories scored above 1.0', () => {
		expect(countAboveAverage({ [PTS]: 1.2, [TOV]: 0.8, total: 1 }, [PTS, TOV])).toBe(1);
		expect(countAboveAverage({ [PTS]: 1.2, [TOV]: 1.1, total: 1.15 }, [PTS, TOV])).toBe(2);
		expect(countAboveAverage({ [PTS]: 1, [TOV]: 1, total: 1 }, [PTS, TOV])).toBe(0);
	});
});

describe('punted categories', () => {
	const BLK = 6;

	it('stay scored but leave the total, and ranking-only still wins', () => {
		const config = makeConfig({ key_columns: [PTS, TOV, BLK], ranking_only_columns: [BLK], punt_columns: [TOV] });
		expect(puntableColumns(config)).toEqual([PTS, TOV]);
		expect(overallColumns(config)).toEqual([PTS]);
		expect(scoredColumns(config)).toEqual([PTS, TOV, BLK]);
		const ranking = playerRanking([1, 'P', 20, 600, 30, 1, 3], config, { [PTS]: 20, [TOV]: 2, [BLK]: 1 });
		expect(ranking[TOV]).toBe(1.5);
		expect(ranking.total).toBe(1.5);
	});

	it('ignores punts for columns that are no longer scoring categories', () => {
		expect(overallColumns(makeConfig({ punt_columns: [9] }))).toEqual([PTS, TOV]);
	});
});

describe('percentages weighted by attempts', () => {
	// Columns: 0 id, 1 name, 2 games, 3 total minutes, 4 FT (season total), 5 FTA (season total), 6 FT%
	const COLUMNS = ['Rk', 'Player', 'G', 'MP', 'FT', 'FTA', 'FT%'];
	const FT_PCT = 6;
	const shooter = (id, made, attempts, games = 10) => [id, `P${id}`, games, games * 30, made * games, attempts * games, attempts ? made / attempts : 0];
	const weightConfig = (overrides = {}) => makeConfig({ key_columns: [FT_PCT], negative_columns: [], weight_percentages: true, ...overrides });
	const parts = { made: 4, attempts: 5 };

	it('finds makes and attempts columns by header', () => {
		expect(percentageParts(COLUMNS)).toEqual({ [FT_PCT]: parts });
		expect(percentageParts(['Player', 'FG%', 'FGA'])).toEqual({});
	});

	it('scores extra makes over an average shooter: volume counts', () => {
		const baseline = { percentage: 0.78, attempts: 3 };
		expect(weightedPercentageScore(7.2, 8, baseline)).toBe(1.4103);
		expect(weightedPercentageScore(0.9, 1, baseline)).toBe(1.0513);
		expect(weightedPercentageScore(4.8, 8, baseline)).toBe(0.3846);
		expect(weightedPercentageScore(2.34, 3, baseline)).toBe(1);
		expect(weightedPercentageScore(1, 1, { percentage: 0, attempts: 0 })).toBe(0);
	});

	it('uses the league percentage (total makes / attempts) and per-game attempts over the pool', () => {
		const players = [shooter(1, 9, 10), shooter(2, 1, 2), shooter(3, 3, 6), shooter(4, 5, 5, 2)];
		// Player 4 misses the minimum games
		expect(percentageBaseline(players, parts, weightConfig())).toEqual({ made: 4, attemptsColumn: 5, percentage: 0.7222, attempts: 6 });
		expect(percentageBaseline(players, parts, weightConfig({ average_mode: AVERAGE_MODE_MEDIAN })).attempts).toBe(6);
		// Pool size keeps the players with the most attempts
		expect(percentageBaseline(players, parts, weightConfig({ average_pool_size: 2 }))).toMatchObject({ percentage: 0.75, attempts: 8 });
		expect(percentageBaseline([shooter(1, 0, 0)], parts, weightConfig())).toBeNull();
	});

	it('treats makes and attempts listed in Season Totals as already per-game', () => {
		const perGameRow = [1, 'P1', 10, 300, 9, 10, 0.9];
		const baseline = percentageBaseline([perGameRow], parts, weightConfig({ yearly_total_columns: [4, 5] }));
		expect(baseline).toMatchObject({ percentage: 0.9, attempts: 10 });
	});

	it('weights only when turned on, and the high-volume shooter wins', () => {
		const players = [shooter(1, 7.2, 8), shooter(2, 0.9, 1), shooter(3, 3, 4)];
		const on = categoryBaselines(players, COLUMNS, weightConfig());
		expect(weightedColumns(on)).toEqual([FT_PCT]);
		const volume = playerRanking(players[0], weightConfig(), on);
		const rare = playerRanking(players[1], weightConfig(), on);
		expect(volume[FT_PCT]).toBeGreaterThan(rare[FT_PCT]);
		expect(volume.total).toBe(volume[FT_PCT]);

		const off = categoryBaselines(players, COLUMNS, weightConfig({ weight_percentages: false }));
		expect(weightedColumns(off)).toEqual([]);
		const plainVolume = playerRanking(players[0], weightConfig({ weight_percentages: false }), off);
		const plainRare = playerRanking(players[1], weightConfig({ weight_percentages: false }), off);
		expect(plainVolume[FT_PCT]).toBe(plainRare[FT_PCT]);
	});

	it('falls back to the plain percentage without makes/attempts columns', () => {
		const players = [shooter(1, 9, 10), shooter(2, 3, 6)];
		const baselines = categoryBaselines(players, ['Rk', 'Player', 'G', 'MP', 'x', 'y', 'FT%'], weightConfig());
		expect(weightedColumns(baselines)).toEqual([]);
		expect(typeof baselines[FT_PCT]).toBe('number');
	});
});
