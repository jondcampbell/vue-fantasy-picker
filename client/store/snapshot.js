// Sends a small summary of the lists (my team, taken, watch list, league rosters, best free agents) to the
// dev server, which writes it to .local/state.json so it can be read outside the browser. Datasets aren't included.

import { roundFloat, scoredColumns, overallColumns } from './scoring'
import { ESPN_PREFIX } from './identity'

export const SNAPSHOT_ROUTE = '/state-snapshot';

// Best unrostered players included, by overall score
const FREE_AGENTS = 40;

// Plain JSON summary of the store's lists, with names, positions, category scores and per-game stats
export const buildSnapshot = function(store) {
	const config = store.config;
	const columns = scoredColumns(config);
	const overall = overallColumns(config);
	const header = column => store.columns[column] ?? String(column);
	const scoreByKey = new Map(store.scores.map(score => [score.playerKey, score.scoreData]));
	const ir = new Set(store.ir_players);

	const nameFor = function(key) {
		const row = store.keyRows.get(key);
		return (row && row[config.name_column]) || store.espnInfo.get(key)?.name || store.list_names[key] || key;
	};
	// Category scores (1.0 = average, higher is always better) and the raw per-game values behind them
	const details = function(key) {
		const scoreData = scoreByKey.get(key);
		const row = store.keyRows.get(key);
		return {
			// ESPN's status as of the last Update stats (ACTIVE, DAY_TO_DAY, OUT, ...); no return dates
			injury: store.espnInfo.get(key)?.injury || null,
			positions: store.eligiblePositions(key),
			score: scoreData ? roundFloat(scoreData.total, 3) : null,
			categories: scoreData ? Object.fromEntries(columns.map(column => [header(column), roundFloat(scoreData[column], 3)])) : null,
			stats: row ? Object.fromEntries(columns.map(column => [header(column), roundFloat(Number(row[column]) || 0, 3)])) : null,
			games: row ? Number(row[config.games_column]) || 0 : null
		};
	};
	const named = keys => keys.map(key => ({ key, name: nameFor(key) }));
	const league = store.league;
	const rostered = new Set([...store.my_team, ...store.taken_players]);

	return {
		league: league ? { name: league.name, teamName: league.teamName, drafted: league.drafted, syncedAt: league.syncedAt } : null,
		activeDataset: store.active_dataset,
		categories: columns.map(column => ({
			name: header(column),
			inOverall: overall.includes(column),
			lowerIsBetter: config.negative_columns.includes(column)
		})),
		myTeam: store.my_team.map(key => ({ key, name: nameFor(key), ...details(key), ir: ir.has(key) })),
		taken: named(store.taken_players),
		watchList: named(store.watch_list),
		// Every team's roster from the last league sync; ESPN IDs map to the same keys the lists use
		teams: (league?.rosters || []).map(team => ({
			name: team.name,
			abbrev: team.abbrev,
			mine: team.mine,
			players: team.players.map(player => {
				const key = store.espn_links[player.espnId] || ESPN_PREFIX + player.espnId;
				return { key, name: player.name || nameFor(key), slot: player.slot, ...details(key) };
			})
		})),
		freeAgents: [...store.scores]
			.filter(score => !rostered.has(score.playerKey))
			.sort((a, b) => b.scoreData.total - a.scoreData.total)
			.slice(0, FREE_AGENTS)
			.map(score => ({ key: score.playerKey, name: nameFor(score.playerKey), ...details(score.playerKey) }))
	};
};

// Post the snapshot after every change that alters it; failures are ignored (e.g. no dev server)
export const shareSnapshot = function(store, fetchImpl = (...args) => fetch(...args)) {
	let last = null;
	const send = function() {
		const body = JSON.stringify(buildSnapshot(store));
		if (body === last) {
			return;
		}
		last = body;
		Promise.resolve()
			.then(() => fetchImpl(SNAPSHOT_ROUTE, { method: 'POST', headers: { 'content-type': 'application/json' }, body }))
			.catch(() => {});
	};

	send();
	store.$subscribe(send, { detached: true });
};
