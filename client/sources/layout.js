// Every stats source is converted to the Basketball-Reference "Player Totals" CSV layout, so imported
// CSVs and API data share one pipeline and the column settings in Configure work for all of them.
// API rows add one extra column with the player's ESPN ID.

export const BBREF_COLUMNS = [
	'Rk', 'Player', 'Age', 'Team', 'Pos', 'G', 'GS', 'MP', 'FG', 'FGA', 'FG%', '3P', '3PA', '3P%',
	'2P', '2PA', '2P%', 'eFG%', 'FT', 'FTA', 'FT%', 'ORB', 'DRB', 'TRB', 'AST', 'STL', 'BLK', 'TOV',
	'PF', 'PTS', 'Trp-Dbl', 'Awards', 'Player-additional'
];
export const ESPN_ID_HEADER = 'ESPN ID';
export const API_COLUMNS = [...BBREF_COLUMNS, ESPN_ID_HEADER];

// Missing stats (e.g. ESPN projections have no games started or fouls) become 0
const TOTAL_FIELDS = ['gp', 'gs', 'min', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'orb', 'drb', 'trb', 'ast', 'stl', 'blk', 'tov', 'pf', 'pts'];

const ratio = (made, attempts) => (attempts > 0 ? Math.round((made / attempts) * 1000) / 1000 : '');
const num = (value) => (Number.isFinite(value) ? value : 0);

/**
 * Build one row from season totals.
 * player: { name, age, team, pos, bbrefId, espnId }
 * totals: { gp, gs, min, fgm, fga, tpm, tpa, ftm, fta, orb, drb, trb, ast, stl, blk, tov, pf, pts }
 */
export const buildRow = function(rank, player, totals) {
	const t = Object.fromEntries(TOTAL_FIELDS.map(field => [field, num(totals[field])]));
	const twoMade = t.fgm - t.tpm;
	const twoAttempts = t.fga - t.tpa;
	return [
		rank,
		player.name,
		player.age ?? '',
		player.team ?? '',
		player.pos ?? '',
		t.gp,
		t.gs,
		t.min,
		t.fgm,
		t.fga,
		ratio(t.fgm, t.fga),
		t.tpm,
		t.tpa,
		ratio(t.tpm, t.tpa),
		twoMade,
		twoAttempts,
		ratio(twoMade, twoAttempts),
		t.fga > 0 ? Math.round(((t.fgm + 0.5 * t.tpm) / t.fga) * 1000) / 1000 : '',
		t.ftm,
		t.fta,
		ratio(t.ftm, t.fta),
		t.orb,
		t.drb,
		t.trb,
		t.ast,
		t.stl,
		t.blk,
		t.tov,
		t.pf,
		t.pts,
		'',
		'',
		player.bbrefId ?? '',
		player.espnId ?? ''
	];
};

// Season ending year for a date: the 2026-27 season (from October 2026) is 2027, as ESPN and nbaapi number it
export const currentSeason = function(date = new Date()) {
	return date.getMonth() >= 8 ? date.getFullYear() + 1 : date.getFullYear();
};

export const seasonLabel = (season) => `${season - 1}-${String(season).slice(2)}`;
