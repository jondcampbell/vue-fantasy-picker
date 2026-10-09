// Private ESPN league sync, fetched through the local proxy in server/espnLeague.js (which adds the
// login cookies from .env.local). Parses league settings (lineup slots, scoring categories) and
// fantasy rosters. Kept store-free so it can be unit tested.

import { BENCH, IR } from '../store/roster';

export const LEAGUE_ROUTE = '/espn-league';

// ESPN lineup slot ids, in ESPN's lineup order
export const ESPN_SLOTS = {
	0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C', 5: 'G', 6: 'F', 7: 'SG/SF', 8: 'G/F', 9: 'PF/C', 10: 'F/C',
	11: 'UTIL', 12: BENCH, 13: IR
};
const SLOT_ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// ESPN scoring stat ids -> Basketball-Reference column headers (see client/sources/layout.js)
export const ESPN_STAT_COLUMNS = {
	0: 'PTS', 1: 'BLK', 2: 'STL', 3: 'AST', 4: 'ORB', 5: 'DRB', 6: 'TRB', 9: 'PF', 11: 'TOV',
	13: 'FG', 14: 'FGA', 15: 'FT', 16: 'FTA', 17: '3P', 18: '3PA', 19: 'FG%', 20: 'FT%', 21: '3P%'
};
// Names for categories the app can't score, so the sync can say which ones were skipped
const ESPN_STAT_NAMES = { 37: 'Double-doubles', 38: 'Triple-doubles', 35: 'A/TO', 40: 'Minutes', 42: 'Games played' };

export const fetchLeague = async function(season, fetchImpl = (...args) => fetch(...args)) {
	const response = await fetchImpl(`${LEAGUE_ROUTE}?season=${season}`, { headers: { Accept: 'application/json' } });
	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(body.error || `League sync failed (${response.status})`);
	}
	return { json: body, swid: response.headers.get('x-espn-swid') };
};

const entryPlayer = function(entry) {
	const player = entry.playerPoolEntry?.player || entry.player || {};
	return {
		espnId: String(entry.playerId ?? player.id),
		name: player.fullName || '',
		slot: ESPN_SLOTS[entry.lineupSlotId] || null
	};
};

/**
 * json: the league response (views mTeam, mRoster, mSettings); swid: your ESPN account id.
 * Returns {
 *   name, scoringType, drafted,
 *   rosterSlots: ['PG', ..., 'Bench', 'IR'],
 *   categories: [{ statId, column, reverse, name }],   column null = can't be scored here
 *   myTeam: { id, name, abbrev } | null,
 *   teams: [{ id, name, abbrev, mine, players: [{ espnId, name, slot }] }]
 * }
 */
export const parseLeague = function(json, swid) {
	const settings = json.settings || {};
	const counts = settings.rosterSettings?.lineupSlotCounts || {};
	const rosterSlots = SLOT_ORDER.flatMap(id => Array(Number(counts[id]) || 0).fill(ESPN_SLOTS[id]));

	const categories = (settings.scoringSettings?.scoringItems || []).map(item => ({
		statId: item.statId,
		column: ESPN_STAT_COLUMNS[item.statId] || null,
		reverse: Boolean(item.isReverseItem),
		name: ESPN_STAT_COLUMNS[item.statId] || ESPN_STAT_NAMES[item.statId] || `ESPN stat ${item.statId}`
	}));

	const teams = (json.teams || []).map(team => ({
		id: team.id,
		name: team.name || [team.location, team.nickname].filter(Boolean).join(' ') || `Team ${team.id}`,
		abbrev: team.abbrev || '',
		mine: Boolean(swid) && (team.owners || []).includes(swid),
		players: (team.roster?.entries || []).map(entryPlayer)
	}));
	const mine = teams.find(team => team.mine);

	return {
		name: settings.name || '',
		scoringType: settings.scoringSettings?.scoringType || '',
		// Before the draft every roster is empty; syncing then must not clear your lists
		drafted: Boolean(json.draftDetail?.drafted) || teams.some(team => team.players.length > 0),
		rosterSlots,
		categories,
		myTeam: mine ? { id: mine.id, name: mine.name, abbrev: mine.abbrev } : null,
		teams
	};
};
