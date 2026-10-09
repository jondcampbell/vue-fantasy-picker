// ESPN fantasy basketball player pool (unofficial, no key needed; CORS allows localhost).
// One request per season returns every player with season totals, ESPN projections, recent splits,
// position eligibility, injury status and ESPN's draft rank.

import { buildRow, seasonLabel } from './layout';

export const ESPN_API = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba';

export const espnPlayersUrl = (season) => `${ESPN_API}/seasons/${season}/players?scoringPeriodId=0&view=kona_player_info`;

// ESPN slot / position ids (lineup slots 0-4 are the base positions)
export const ESPN_POSITIONS = { 0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C' };
const DEFAULT_POSITIONS = { 1: 'PG', 2: 'SG', 3: 'SF', 4: 'PF', 5: 'C' };

export const ESPN_TEAMS = {
	0: 'FA', 1: 'ATL', 2: 'BOS', 3: 'NOP', 4: 'CHI', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GSW', 10: 'HOU',
	11: 'IND', 12: 'LAC', 13: 'LAL', 14: 'MIA', 15: 'MIL', 16: 'MIN', 17: 'BKN', 18: 'NYK', 19: 'ORL', 20: 'PHL',
	21: 'PHO', 22: 'POR', 23: 'SAC', 24: 'SAS', 25: 'OKC', 26: 'UTA', 27: 'WAS', 28: 'TOR', 29: 'MEM', 30: 'CHA'
};

// ESPN stat ids -> our totals fields
const STAT_IDS = {
	gp: 42, gs: 41, min: 40, fgm: 13, fga: 14, tpm: 17, tpa: 18, ftm: 15, fta: 16,
	orb: 4, drb: 5, trb: 6, ast: 3, stl: 2, blk: 1, tov: 11, pf: 9, pts: 0
};

// Stat split ids are "<type><season>": 00 = season totals, 10 = ESPN projection, 03 = last 30 days
export const espnSplits = (season) => [
	{ kind: 'actual', season: season, statId: `00${season}`, label: `${seasonLabel(season)} Actual` },
	{ kind: 'projection', season: season, statId: `10${season}`, label: `${seasonLabel(season)} ESPN Projection` },
	{ kind: 'last30', season: season, statId: `03${season}`, label: `${seasonLabel(season)} Last 30 Days` },
	{ kind: 'actual', season: season - 1, statId: `00${season - 1}`, label: `${seasonLabel(season - 1)} Actual` }
];

// Without a filter ESPN returns only 50 players; this returns every active player (~1,100)
export const ESPN_PLAYERS_FILTER = JSON.stringify({ filterActive: { value: true } });

export const fetchEspnPlayers = async function(season, fetchImpl = (...args) => fetch(...args)) {
	const response = await fetchImpl(espnPlayersUrl(season), { headers: { Accept: 'application/json', 'x-fantasy-filter': ESPN_PLAYERS_FILTER } });
	if (!response.ok) {
		throw new Error(`ESPN returned ${response.status}`);
	}
	return response.json();
};

const totalsFrom = function(stats) {
	const totals = {};
	Object.entries(STAT_IDS).forEach(([field, id]) => {
		totals[field] = Number(stats[id]) || 0;
	});
	return totals;
};

/**
 * Parse the ESPN player pool. Inactive/historical entries (no eligibility) are skipped.
 * Returns [{ espnId, name, team, pos, eligible, injury, espnRank, splits: { [statId]: totals } }]
 */
export const parseEspnPlayers = function(json) {
	return json.filter(player => player.active && Array.isArray(player.eligibleSlots)).map(player => {
		const splits = {};
		(player.stats || []).forEach(split => {
			splits[split.id] = totalsFrom(split.stats || {});
		});
		const ranks = player.draftRanksByRankType || {};
		return {
			espnId: String(player.id),
			name: player.fullName,
			team: ESPN_TEAMS[player.proTeamId] ?? '',
			pos: DEFAULT_POSITIONS[player.defaultPositionId] ?? '',
			eligible: player.eligibleSlots.filter(slot => slot in ESPN_POSITIONS).map(slot => ESPN_POSITIONS[slot]),
			injury: player.injuryStatus || '',
			// ROTO rank suits category leagues; fall back to the standard (points) rank
			espnRank: ranks.ROTO?.rank || ranks.STANDARD?.rank || null,
			splits: splits
		};
	});
};

/**
 * One dataset per split that has data. Players appear when they have played (or are projected to play).
 * Returns [{ id, label, kind, season, source, rows }] with rows in the API column layout.
 */
export const espnDatasets = function(players, season) {
	return espnSplits(season).map(split => {
		const withStats = players
			.filter(player => player.splits[split.statId]?.gp > 0)
			.sort((a, b) => b.splits[split.statId].pts - a.splits[split.statId].pts);
		return {
			id: `espn-${split.kind}-${split.season}`,
			label: split.label,
			kind: split.kind,
			season: split.season,
			source: 'ESPN',
			rows: withStats.map((player, index) => buildRow(index + 1, player, player.splits[split.statId]))
		};
	}).filter(dataset => dataset.rows.length > 0);
};
