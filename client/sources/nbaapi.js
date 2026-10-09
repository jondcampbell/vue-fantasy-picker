// nbaapi.com: free community API with Basketball-Reference season totals and IDs (no key; CORS open).
// Max 50 rows per page, so a season takes ~20 requests.

import { buildRow, seasonLabel } from './layout';

export const NBAAPI = 'https://api.server.nbaapi.com/api/playertotals';
const PAGE_SIZE = 50;

export const fetchNbaapiSeason = async function(season, fetchImpl = (...args) => fetch(...args), onProgress = () => {}) {
	const rows = [];
	let page = 1;
	let pages;
	do {
		const response = await fetchImpl(`${NBAAPI}?season=${season}&pageSize=${PAGE_SIZE}&page=${page}`, { headers: { Accept: 'application/json' } });
		if (!response.ok) {
			throw new Error(`nbaapi returned ${response.status}`);
		}
		const json = await response.json();
		rows.push(...json.data);
		pages = json.pagination?.pages || 1;
		onProgress(page, pages);
		page++;
	} while (page <= pages);
	return rows;
};

/**
 * Regular-season players, one per Basketball-Reference ID. Traded players have a combined "2TM"/"3TM"
 * row plus one per team, not always in that order, so the combined row is picked explicitly.
 * Returns [{ bbrefId, name, team, pos, age, totals }]
 */
export const parseNbaapiRows = function(rows) {
	const byId = new Map();
	rows.filter(row => !row.isPlayoff).forEach(row => {
		const current = byId.get(row.playerId);
		const combined = /^\dTM$/.test(row.team || '');
		if (!current || combined) {
			byId.set(row.playerId, row);
		}
	});
	return [...byId.values()].map(row => ({
		bbrefId: row.playerId,
		name: row.playerName,
		team: row.team,
		pos: row.position,
		age: row.age,
		totals: {
			gp: row.games,
			gs: row.gamesStarted,
			// nbaapi names this minutesPg but it holds season total minutes
			min: row.minutesPg,
			fgm: row.fieldGoals,
			fga: row.fieldAttempts,
			tpm: row.threeFg,
			tpa: row.threeAttempts,
			ftm: row.ft,
			fta: row.ftAttempts,
			orb: row.offensiveRb,
			drb: row.defensiveRb,
			trb: row.totalRb,
			ast: row.assists,
			stl: row.steals,
			blk: row.blocks,
			tov: row.turnovers,
			pf: row.personalFouls,
			pts: row.points
		}
	}));
};

// espnIdFor(bbrefId) fills the ESPN ID column for players already linked in the registry
export const nbaapiDataset = function(players, season, espnIdFor = () => '') {
	const sorted = players.filter(player => player.totals.gp > 0).sort((a, b) => b.totals.pts - a.totals.pts);
	return {
		id: `bbref-actual-${season}`,
		label: `${seasonLabel(season)} Actual (Basketball-Reference)`,
		kind: 'actual',
		season: season,
		source: 'Basketball-Reference',
		rows: sorted.map((player, index) => buildRow(index + 1, { ...player, espnId: espnIdFor(player.bbrefId) }, player.totals))
	};
};
