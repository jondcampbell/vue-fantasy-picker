import { markRaw, toRaw } from 'vue'
import { createPinia, defineStore } from 'pinia'
import { meetsMinimums, categoryAverage, playerRanking, countAboveAverage, scoredColumns, overallColumns } from './scoring'
import { persist } from './persist'
import { POSITIONS, DEFAULT_SLOTS, assignRoster, openSlots, openSlotChecker, isStarterSlot } from './roster'
import { detectKeyColumn, detectEspnColumn, detectTeamColumn, computeKeys, reconcileKeys, isNameKey, ESPN_PREFIX } from './identity'
import { normalizeRows } from './normalize'
import { linkPlayers } from './registry'
import { API_COLUMNS, BBREF_COLUMNS, currentSeason, seasonLabel } from '../sources/layout'
import { fetchEspnPlayers, parseEspnPlayers, espnDatasets } from '../sources/espn'
import { fetchNbaapiSeason, parseNbaapiRows, nbaapiDataset } from '../sources/nbaapi'
import { fetchLeague, parseLeague } from '../sources/espnLeague'

const defaultState = () => ({
	config: {
		top_players: 5,
		teams_in_league:12,
		players_per_team:13,
		average_mode: 1,
		average_pool_size: 'all',
		min_games_played: 10,
		min_minutes_played: 8,
		screen:1,
		id_column:0,
		// Stable player ID column (Basketball-Reference "Player-additional"), detected on import; null = match by name
		key_column: null,
		// ESPN player ID column (API datasets), detected on load; null when absent
		espn_column: null,
		name_column:1,
		negative_columns: [
			27
		],
		games_column: 5,
		minutes_column: 7,
		pos_column: 4,
		yearly_total_columns: [
			11,
			23,
			24,
			25,
			26,
			27,
			29
		],
		// Scored and rankable, but not counted in the total
		ranking_only_columns: [
			26,
			27
		],
		key_columns:[
			10,
			11,
			20,
			23,
			24,
			25,
			//26,
			//27,
			29
		],
		positions: [
			'SG',
			'PG',
			'C',
			'PF',
			'SF'
		],
		// Lineup slots for My Team (ESPN layout); see client/store/roster.js
		roster_slots: [...DEFAULT_SLOTS],
	},
	players: [],
	columns: [],
	column_averages:{},
	scores: [],
	active_category: 'total',
	active_position: 'all',
	active_filter: 'none',
	// Rankings/Players: only players who would start in an open slot on My Team
	fits_open_slots: false,
	search_text: '',
	// Lists hold player keys (see client/store/identity.js) so they survive re-importing updated stats
	my_team: [],
	taken_players: [],
	watch_list: [],
	// player key -> extra positions the league allows beyond the CSV position
	position_overrides: {},
	// my team players parked in IR slots
	ir_players: [],
	// player key -> display name, so list entries missing from new data can still be shown
	list_names: {},

	// Stat sources (see client/sources): { [id]: { id, label, kind, season, source, fetchedAt, columns, rows } }
	// rows are raw season totals; the active dataset is normalized into players/columns
	datasets: {},
	active_dataset: null,
	// ESPN player ID -> Basketball-Reference ID, so both sources map to the same player
	espn_links: {},
	// ESPN players we couldn't link automatically, with suggested matches (see registry.js)
	unlinked: [],
	// ESPN player ID -> { name, team, pos, eligible, injury, espnRank }
	espn_players: {},
	// player key -> overall score computed from ESPN's projected stats (the Rankings "Proj" column)
	projection_totals: {},
	stats_updated_at: null,
	// Last ESPN league sync: { name, teamName, teams, drafted, syncedAt, skippedCategories }
	league: null
});

const PLAYER_LISTS = ['my_team', 'taken_players', 'watch_list'];
export const LIST_LABELS = { my_team: 'My Team', taken_players: 'Taken', watch_list: 'Watch List' };

// Baselines and scores for a set of normalized rows
const scoreRows = function(players, config, rowKeys) {
	const averages = {};
	scoredColumns(config).forEach(column => {
		averages[column] = categoryAverage(players, column, config);
	});
	const scores = players.filter(player => meetsMinimums(player, config)).map(player => {
		const scoreData = playerRanking(player, config, averages);
		scoreData.aboveAverage = countAboveAverage(scoreData, overallColumns(config));
		return {
			playerKey: rowKeys.get(player),
			scoreData: scoreData,
			playerName: player[config.name_column],
			playerPosition: player[config.pos_column],
			playerGames: player[config.games_column]
		};
	});
	return { averages, scores };
};

// Column settings for a dataset's own columns (ID column positions can differ between sources)
const configFor = (config, columns) => ({ ...config, key_column: detectKeyColumn(columns), espn_column: detectEspnColumn(columns) });

// Look up full player rows for a list of player keys, skipping keys not in the current data
const playersForKeys = function(keyRows, keys) {
	return keys.map(key => keyRows.get(key)).filter(Boolean);
};

export const usePickerStore = defineStore('picker', {
	state: defaultState,

	getters: {
		// Names of the columns counted in the overall score (scoring categories minus ranking-only)
		keyColumns: (state) => {
			const overall = overallColumns(state.config);
			return state.columns.filter((column, index) => overall.includes(index));
		},
		activeCategoryName: (state) => {
			if (state.active_category == 'total') {
				return 'Total score';
			} else {
				return state.columns[state.active_category];
			}
		},

		// Player identity: row -> key and key -> row for the current data
		rowKeys: (state) => computeKeys(state.players, state.columns, state.config, state.espn_links),
		keyRows() {
			const keyRows = new Map();
			this.rowKeys.forEach((key, row) => keyRows.set(key, row));
			return keyRows;
		},

		// Fast lookup sets for list membership
		watchedSet: (state) => new Set(state.watch_list),
		myTeamSet: (state) => new Set(state.my_team),
		takenSet: (state) => new Set(state.taken_players),
		isWatched() {
			return (key) => this.watchedSet.has(key);
		},
		isOnTeam() {
			return (key) => this.myTeamSet.has(key);
		},
		isTaken() {
			return (key) => this.takenSet.has(key);
		},

		// ESPN details by player key (eligibility, injury, ESPN rank)
		espnInfo() {
			const info = new Map();
			Object.entries(this.espn_players).forEach(([espnId, player]) => {
				info.set(this.espn_links[espnId] || ESPN_PREFIX + espnId, { espnId, ...player });
			});
			return info;
		},

		// Datasets without their rows, newest season first, for the Data page and switcher
		datasetList() {
			const order = { actual: 0, projection: 1, last30: 2 };
			return Object.values(this.datasets)
				.map(({ rows, ...meta }) => ({ ...meta, players: rows.length }))
				.sort((a, b) => (b.season || 0) - (a.season || 0) || (order[a.kind] ?? 3) - (order[b.kind] ?? 3) || a.label.localeCompare(b.label));
		},
		// The ESPN projection used for the Proj column: the newest season's
		projectionDataset() {
			return this.datasetList.find(dataset => dataset.kind === 'projection') || null;
		},

		// List entries whose player isn't in the current data: ambiguous (pick one) or missing
		listIssues() {
			if (this.players.length === 0) {
				return [];
			}
			const config = this.config;
			const teamColumn = detectTeamColumn(this.columns);
			// Players ESPN knows (e.g. rostered rookies) aren't issues: they just have no stats in this dataset
			const keys = [...new Set(PLAYER_LISTS.flatMap(list => this[list]))].filter(key => !this.keyRows.has(key) && !this.espnInfo.has(key));
			const results = reconcileKeys(keys, this.keyRows, this.list_names, config);
			return keys.map(key => {
				const result = results.get(key);
				return {
					key: key,
					name: this.list_names[key] || key,
					lists: PLAYER_LISTS.filter(list => this[list].includes(key)),
					status: result.status === 'ambiguous' ? 'ambiguous' : 'missing',
					candidates: (result.candidates || []).map(candidate => {
						const row = this.keyRows.get(candidate);
						return {
							key: candidate,
							name: row[config.name_column],
							position: row[config.pos_column],
							games: row[config.games_column],
							team: teamColumn != null ? row[teamColumn] : ''
						};
					})
				};
			});
		},

		// Positions a player can fill: the stats file's position, ESPN's eligibility and extra positions you added
		eligiblePositions() {
			const posColumn = this.config.pos_column;
			const keyRows = this.keyRows;
			const espnInfo = this.espnInfo;
			const overrides = this.position_overrides;
			return (key) => {
				const row = keyRows.get(key);
				const espn = espnInfo.get(key);
				const listed = String((row ? row[posColumn] : espn?.pos) ?? '').split(/[^A-Z]+/);
				const espnEligible = espn?.eligible || [];
				const extra = overrides[key] || [];
				return POSITIONS.filter(p => listed.includes(p) || espnEligible.includes(p) || extra.includes(p));
			};
		},

		// My team with lineup eligibility and overall score, for roster slot assignment
		rosterPlayers() {
			const config = this.config;
			const scoreByKey = new Map(this.scores.map(score => [score.playerKey, score.scoreData.total]));
			const ir = new Set(this.ir_players);
			// Players without stats in this dataset (e.g. rookies) still fill a slot, using ESPN's details
			return this.my_team.filter(key => this.keyRows.has(key) || this.espnInfo.has(key)).map(key => {
				const player = this.keyRows.get(key);
				const espn = this.espnInfo.get(key);
				return {
					key: key,
					name: player ? player[config.name_column] : espn.name,
					position: player ? player[config.pos_column] : espn.pos,
					espnEligible: espn?.eligible || [],
					positions: this.eligiblePositions(key),
					score: scoreByKey.get(key),
					ir: ir.has(key)
				};
			});
		},
		roster() {
			return assignRoster(this.rosterPlayers, this.config.roster_slots);
		},
		openRosterSlots() {
			return openSlots(this.roster.assignments);
		},
		openStarterSlots() {
			return this.openRosterSlots.filter(({ slot }) => isStarterSlot(slot));
		},
		// key => true when that player (not already on My Team) would start in an open slot
		fitsOpenSlot() {
			const fits = openSlotChecker(this.rosterPlayers, this.config.roster_slots);
			const mine = this.myTeamSet;
			return (key) => !mine.has(key) && fits(this.eligiblePositions(key));
		},

		myPlayers() {
			return this.scores.length > 0 ? playersForKeys(this.keyRows, this.my_team) : [];
		},
		takenPlayers() {
			return this.scores.length > 0 ? playersForKeys(this.keyRows, this.taken_players) : [];
		},
		watchList() {
			return playersForKeys(this.keyRows, this.watch_list);
		},

		// Raw player rows filtered by the active position, availability and search
		filteredPlayers() {
			const state = this;
			let players = state.players;
			const name_column = state.config.name_column;
			const rowKeys = this.rowKeys;

			if (state.active_position !== 'all') {
				players = players.filter(player => this.eligiblePositions(rowKeys.get(player)).includes(state.active_position));
			}
			players = filterByAvailability(state, players, player => rowKeys.get(player));
			if (state.fits_open_slots) {
				players = players.filter(player => this.fitsOpenSlot(rowKeys.get(player)));
			}
			if (state.search_text !== '') {
				const needle = state.search_text.toLowerCase();
				players = players.filter(player => player[name_column].toLowerCase().includes(needle));
			}
			return players;
		},

		// Filtered scores without sorting (used by best/worst and summaries)
		filteredScores() {
			let scores = this.scores;

			if (this.active_position !== 'all') {
				scores = scores.filter(p => this.eligiblePositions(p.playerKey).includes(this.active_position));
			}
			if (this.search_text !== '') {
				const needle = this.search_text.toLowerCase();
				scores = scores.filter(p => p.playerName.toLowerCase().includes(needle));
			}
			if (this.fits_open_slots) {
				scores = scores.filter(p => this.fitsOpenSlot(p.playerKey));
			}
			return filterByAvailability(this, scores, p => p.playerKey);
		},
		sortedFilteredPlayerScores() {
			const category = this.active_category;
			return [...this.filteredScores].sort((a, b) => b.scoreData[category] - a.scoreData[category]);
		},

		// Precompute best/worst for current filtered set
		bestScores() {
			const list = this.filteredScores;
			const result = {};
			scoredColumns(this.config).forEach(col => {
				let max = undefined;
				for (const player of list) {
					const val = player.scoreData[col];
					if (max === undefined || val > max) max = val;
				}
				if (max !== undefined) result[col] = max;
			});
			return result;
		},
		worstScores() {
			const list = this.filteredScores;
			const result = {};
			scoredColumns(this.config).forEach(col => {
				let min = undefined;
				for (const player of list) {
					const val = player.scoreData[col];
					if (min === undefined || val < min) min = val;
				}
				if (min !== undefined) result[col] = min;
			});
			return result;
		}
	},

	actions: {
		// A CSV becomes the "csv" dataset and is made active. Lists carry over: entries are matched
		// to the new data by player key (see identity.js).
		// Returns { ambiguous, missing } counts of list entries that need attention.
		importPlayers(importData, label = 'Imported CSV') {
			this.datasets = {
				...this.datasets,
				csv: markRaw({ id: 'csv', label: label, kind: 'actual', season: null, source: 'CSV', fetchedAt: Date.now(), columns: importData[0], rows: importData.slice(1) })
			};
			return this.useDataset('csv');
		},
		// Make a stored dataset the one the app shows and scores
		useDataset(id) {
			const dataset = this.datasets[id];
			if (!dataset) {
				return { ambiguous: 0, missing: 0 };
			}
			this.active_dataset = id;
			this.columns = dataset.columns;
			this.config.key_column = detectKeyColumn(dataset.columns);
			this.config.espn_column = detectEspnColumn(dataset.columns);
			this.setPlayers(dataset.rows, { perGame: !dataset.normalized });
			this.reconcileLists();
			this.evaluatePlayers();
			const issues = this.listIssues;
			return {
				ambiguous: issues.filter(issue => issue.status === 'ambiguous').length,
				missing: issues.filter(issue => issue.status === 'missing').length
			};
		},
		setPlayers(rows, options) {
			this.players = markRaw(normalizeRows(rows, this.config, options));
		},
		/**
		 * Download ESPN (stats, projections, eligibility) and Basketball-Reference stats via nbaapi,
		 * link the two ID systems, and store each stat split as a dataset.
		 * fetchImpl is injectable for tests; onProgress(message) reports each step.
		 * Returns { datasets, linked, unlinked, issues: { ambiguous, missing }, warnings }.
		 */
		async updateStats({ fetchImpl = (...args) => fetch(...args), onProgress = () => {}, now = new Date() } = {}) {
			const season = currentSeason(now);
			const warnings = [];

			onProgress('Downloading ESPN players…');
			const espn = parseEspnPlayers(await fetchEspnPlayers(season, fetchImpl));

			// Basketball-Reference IDs/stats for this season and last (this season is empty before tip-off),
			// plus the season before for linking players who missed last season (injuries)
			const bbrefBySeason = {};
			for (const year of [season, season - 1, season - 2]) {
				const label = seasonLabel(year);
				try {
					const rows = await fetchNbaapiSeason(year, fetchImpl, (page, pages) => onProgress(`Downloading Basketball-Reference ${label} (${page}/${pages})…`));
					bbrefBySeason[year] = parseNbaapiRows(rows);
				} catch (error) {
					warnings.push(`Basketball-Reference ${label}: ${error.message}`);
				}
			}

			// Link ESPN to Basketball-Reference. Candidates: every season fetched (newest name wins), IDs in stored
			// datasets (e.g. an imported CSV) and IDs on your lists. Last season's games played break name ties.
			onProgress('Linking players…');
			const candidates = new Map();
			const addCandidate = (bbrefId, name, team, gp = 0) => {
				if (bbrefId && name && !candidates.has(bbrefId)) {
					candidates.set(bbrefId, { bbrefId, name, team, gp });
				}
			};
			[season - 1, season, season - 2].forEach(year => (bbrefBySeason[year] || []).forEach(player => {
				addCandidate(player.bbrefId, player.name, player.team, year === season - 1 ? player.totals.gp : 0);
			}));
			Object.values(this.datasets).forEach(dataset => {
				const config = configFor(this.config, dataset.columns);
				if (config.key_column != null) {
					dataset.rows.forEach(row => addCandidate(String(row[config.key_column] || '').trim(), row[config.name_column], '', 0));
				}
			});
			Object.entries(this.list_names).forEach(([key, name]) => {
				if (!key.startsWith(ESPN_PREFIX) && !isNameKey(key)) {
					addCandidate(key, name, '', 0);
				}
			});
			const bbrefPlayers = [...candidates.values()];
			const relevant = espn.filter(player => Object.values(player.splits).some(split => split.gp > 0));
			const { links, unlinked } = linkPlayers(
				relevant.map(player => ({ espnId: player.espnId, name: player.name, team: player.team, gp: player.splits[`00${season - 1}`]?.gp ?? 0 })),
				bbrefPlayers,
				this.espn_links
			);
			const dismissed = new Set(this.unlinked.filter(entry => entry.dismissed).map(entry => entry.espnId));

			// One dataset per ESPN split and per Basketball-Reference season that has games
			const espnIdFor = Object.fromEntries(Object.entries(links).map(([espnId, bbrefId]) => [bbrefId, espnId]));
			const fetchedAt = now.getTime();
			const built = [
				...espnDatasets(espn, season),
				...[season, season - 1].filter(year => bbrefBySeason[year]).map(year => nbaapiDataset(bbrefBySeason[year], year, id => espnIdFor[id] || ''))
			].filter(dataset => dataset.rows.length > 0);
			const datasets = { ...this.datasets };
			built.forEach(dataset => {
				datasets[dataset.id] = markRaw({ ...dataset, columns: API_COLUMNS, fetchedAt });
			});

			this.espn_links = links;
			this.unlinked = unlinked.map(entry => ({ ...entry, dismissed: dismissed.has(entry.espnId) }));
			this.espn_players = Object.fromEntries(espn.map(({ espnId, splits, ...player }) => [espnId, player]));
			this.datasets = datasets;
			this.stats_updated_at = fetchedAt;

			// Keep the current dataset (now refreshed); otherwise this season's actuals, else ESPN's projection
			const preferred = [this.active_dataset, `espn-actual-${season}`, `espn-projection-${season}`, `espn-actual-${season - 1}`];
			const target = preferred.find(id => id && datasets[id]);
			const issues = target ? this.useDataset(target) : { ambiguous: 0, missing: 0 };

			return {
				datasets: built.length,
				linked: Object.keys(links).length,
				// Players you can link now; the rest (e.g. rookies) link automatically once Basketball-Reference has them
				unlinked: this.unlinked.filter(entry => !entry.dismissed && entry.candidates.length > 0).length,
				issues,
				warnings
			};
		},
		// Link an ESPN player to a Basketball-Reference ID by hand
		linkPlayer(espnId, bbrefId) {
			this.espn_links = { ...this.espn_links, [espnId]: bbrefId };
			this.unlinked = this.unlinked.filter(entry => entry.espnId !== espnId);
			this.renameListKey(ESPN_PREFIX + espnId, bbrefId);
			this.evaluatePlayers();
		},
		// Hide a suggestion that isn't the same player; it stays keyed by its ESPN ID
		dismissLink(espnId) {
			this.unlinked = this.unlinked.map(entry => (entry.espnId === espnId ? { ...entry, dismissed: true } : entry));
		},
		/**
		 * Sync the private ESPN league (one request, via the local proxy): roster slots and scoring categories
		 * from the league settings; after the draft, My Team / Taken / IR replaced by the league's rosters
		 * (watch list and extra positions are kept). Before the draft rosters are empty, so lists are left alone.
		 * Returns { teamName, teams, drafted, myPlayers, takenPlayers, skippedCategories, issues }.
		 */
		async syncLeague({ fetchImpl = (...args) => fetch(...args), now = new Date() } = {}) {
			const { json, swid } = await fetchLeague(currentSeason(now), fetchImpl);
			const league = parseLeague(json, swid);
			if (league.drafted && !league.myTeam) {
				throw new Error("Couldn't find your team in the league: check ESPN_SWID in .env.local.");
			}

			// Settings: lineup slots and scoring categories (lower-is-better ones like TO). Your Ranking Only
			// choices are left alone: they keep a league category out of your own overall score.
			const config = this.config;
			if (league.rosterSlots.length > 0) {
				config.roster_slots = league.rosterSlots;
			}
			const scored = league.categories.filter(category => category.column);
			if (scored.length > 0) {
				const index = header => BBREF_COLUMNS.indexOf(header);
				config.key_columns = scored.map(category => index(category.column)).sort((a, b) => a - b);
				config.negative_columns = scored.filter(category => category.reverse).map(category => index(category.column)).sort((a, b) => a - b);
			}

			// Rosters
			const keyFor = espnId => this.espn_links[espnId] || ESPN_PREFIX + espnId;
			let myPlayers = 0;
			let takenPlayers = 0;
			if (league.drafted) {
				const names = { ...this.list_names };
				const mine = [];
				const taken = [];
				const ir = [];
				league.teams.forEach(team => team.players.forEach(player => {
					const key = keyFor(player.espnId);
					names[key] = player.name;
					if (team.mine) {
						mine.push(key);
						if (player.slot === 'IR') ir.push(key);
					} else {
						taken.push(key);
					}
				}));
				this.my_team = mine;
				this.taken_players = taken;
				this.ir_players = ir;
				this.list_names = names;
				this.forgetUnusedNames();
				myPlayers = mine.length;
				takenPlayers = taken.length;
			}

			this.league = {
				name: league.name,
				teamName: league.myTeam?.name || '',
				teams: league.teams.length,
				drafted: league.drafted,
				syncedAt: now.getTime(),
				skippedCategories: league.categories.filter(category => !category.column).map(category => category.name)
			};

			// Re-load the dataset once so the new settings and lists are applied and scored
			const issues = this.active_dataset && this.datasets[this.active_dataset]
				? this.useDataset(this.active_dataset)
				: (this.evaluatePlayers(), { ambiguous: 0, missing: 0 });

			return { ...this.league, myPlayers, takenPlayers, issues };
		},
		changeScreen(newScreen) {
			this.config.screen = newScreen;
		},
		changeActiveCategory(category) {
			this.active_category = category;
		},
		changeActivePosition(position) {
			this.active_position = position;
		},
		changeActiveFilter(filter) {
			this.active_filter = filter;
		},
		changeFitsOpenSlots(value) {
			this.fits_open_slots = value;
		},
		changeSearchText(search_text) {
			this.search_text = search_text;
		},
		addToList({ list, key }) {
			if (!this[list].includes(key)) {
				this[list] = [...this[list], key];
			}
			const row = this.keyRows.get(key);
			if (row) {
				this.list_names = { ...this.list_names, [key]: row[this.config.name_column] };
			}
		},
		removeFromList({ list, key }) {
			this[list] = this[list].filter(entry => entry !== key);
			if (list === 'my_team') {
				this.ir_players = this.ir_players.filter(entry => entry !== key);
				const overrides = { ...this.position_overrides };
				delete overrides[key];
				this.position_overrides = overrides;
			}
			this.forgetUnusedNames();
		},
		// Remove a player from every list (e.g. one who is no longer in the data)
		dropListEntry(key) {
			PLAYER_LISTS.forEach(list => this.removeFromList({ list, key }));
		},
		// Point a list entry at a different player key everywhere it is used
		renameListKey(oldKey, newKey) {
			if (oldKey === newKey) {
				return;
			}
			const swap = keys => [...new Set(keys.map(key => (key === oldKey ? newKey : key)))];
			PLAYER_LISTS.forEach(list => { this[list] = swap(this[list]); });
			this.ir_players = swap(this.ir_players);
			const overrides = { ...this.position_overrides };
			if (overrides[oldKey]) {
				overrides[newKey] = overrides[oldKey];
				delete overrides[oldKey];
			}
			this.position_overrides = overrides;
			const row = this.keyRows.get(newKey);
			this.list_names = { ...this.list_names, [newKey]: row ? row[this.config.name_column] : this.list_names[oldKey] };
			this.forgetUnusedNames();
		},
		// Match list entries to the current data: move entries whose player is found under a new key,
		// refresh remembered names; ambiguous and missing entries are left for listIssues to show
		reconcileLists() {
			if (this.players.length === 0) {
				return;
			}
			// Entries saved under an ESPN ID that has since been linked move to the Basketball-Reference ID
			PLAYER_LISTS.flatMap(list => this[list]).forEach(key => {
				const linked = key.startsWith(ESPN_PREFIX) && this.espn_links[key.slice(ESPN_PREFIX.length)];
				if (linked) {
					this.renameListKey(key, linked);
				}
			});
			const keys = [...new Set([...PLAYER_LISTS.flatMap(list => this[list]), ...this.ir_players])];
			const results = reconcileKeys(keys, this.keyRows, this.list_names, this.config);
			results.forEach((result, key) => {
				if (result.status === 'moved') {
					this.renameListKey(key, result.key);
				}
			});
			const names = { ...this.list_names };
			PLAYER_LISTS.flatMap(list => this[list]).forEach(key => {
				const row = this.keyRows.get(key);
				if (row) {
					names[key] = row[this.config.name_column];
				}
			});
			this.list_names = names;
		},
		forgetUnusedNames() {
			const used = new Set(PLAYER_LISTS.flatMap(list => this[list]));
			const names = {};
			Object.keys(this.list_names).forEach(key => {
				if (used.has(key)) {
					names[key] = this.list_names[key];
				}
			});
			this.list_names = names;
		},
		// Add or remove an extra position the league lets this player fill
		togglePositionOverride({ key, position }) {
			const current = this.position_overrides[key] || [];
			const next = current.includes(position) ? current.filter(p => p !== position) : [...current, position];
			const overrides = { ...this.position_overrides };
			if (next.length > 0) {
				overrides[key] = next;
			} else {
				delete overrides[key];
			}
			this.position_overrides = overrides;
		},
		toggleIr(key) {
			this.ir_players = this.ir_players.includes(key)
				? this.ir_players.filter(entry => entry !== key)
				: [...this.ir_players, key];
		},
		// Every setting change re-scores immediately (a few tens of ms). With a stored dataset the rows are
		// re-normalized too, so column settings like Season Totals apply without re-importing.
		changeConfigSetting({ config_key, config_value }) {
			this.config[config_key] = config_value;
			if (this.active_dataset && this.datasets[this.active_dataset]) {
				this.useDataset(this.active_dataset);
			} else {
				this.evaluatePlayers();
			}
		},
		// Baselines per scored column (key categories plus ranking-only), then a score for each player
		// who meets the minimum games and minutes; also scores ESPN's projection for the Proj column
		evaluatePlayers() {
			const { averages, scores } = scoreRows(this.players, this.config, this.rowKeys);
			this.column_averages = averages;
			this.scores = markRaw(scores);

			// Ranking by a column that is no longer scored falls back to the overall score
			if (this.active_category !== 'total' && !(this.active_category in averages)) {
				this.active_category = 'total';
			}

			this.projection_totals = this.scoreProjection();
		},
		// Overall score per player key from ESPN's projected stats (same scoring settings)
		scoreProjection() {
			const meta = this.projectionDataset;
			if (!meta) {
				return {};
			}
			if (meta.id === this.active_dataset) {
				return Object.fromEntries(this.scores.map(score => [score.playerKey, score.scoreData.total]));
			}
			const dataset = this.datasets[meta.id];
			const config = configFor(this.config, dataset.columns);
			const players = normalizeRows(dataset.rows, config);
			const rowKeys = computeKeys(players, dataset.columns, config, this.espn_links);
			const { scores } = scoreRows(players, config, rowKeys);
			return Object.fromEntries(scores.map(score => [score.playerKey, score.scoreData.total]));
		}
	}
});

// Availability filter shared by raw players and scores; getId reads the player id from a row
const filterByAvailability = function(state, rows, getId) {
	const filter = state.active_filter;
	if (filter === 'untaken') {
		const unavailable = new Set([...state.taken_players, ...state.my_team]);
		return rows.filter(row => !unavailable.has(getId(row)));
	}
	const lists = { mine: state.my_team, watch: state.watch_list, taken: state.taken_players };
	if (lists[filter]) {
		const ids = new Set(lists[filter]);
		return rows.filter(row => ids.has(getId(row)));
	}
	return rows;
};

export const pinia = createPinia();

// Player rows and scores are large and only ever replaced wholesale, never edited in place,
// so keep them out of Vue's deep reactivity (big rendering win for the stat tables)
const markRowsRaw = function(store) {
	store.players = markRaw(toRaw(store.players));
	store.scores = markRaw(toRaw(store.scores));
	store.datasets = Object.fromEntries(Object.entries(toRaw(store.datasets)).map(([id, dataset]) => [id, markRaw(toRaw(dataset))]));
};

// The app's single store instance, with persistence attached on first use
let store;
export const useStore = function() {
	if (!store) {
		store = usePickerStore(pinia);
		persist(store);
		markRowsRaw(store);
		// Re-load the saved dataset so players and scores always match the current logic and settings
		if (store.active_dataset && store.datasets[store.active_dataset]) {
			store.useDataset(store.active_dataset);
		} else if (store.players.length > 0) {
			store.reconcileLists();
			store.evaluatePlayers();
		}
	}
	return store;
};

// Installs Pinia and exposes the store to Options API components as this.$store
export default {
	install(app) {
		app.use(pinia);
		app.config.globalProperties.$store = useStore();
	}
};
