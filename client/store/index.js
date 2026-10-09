import { markRaw, toRaw } from 'vue'
import { createPinia, defineStore } from 'pinia'
import { roundFloat, meetsMinimums, categoryAverage, playerRanking, countAboveAverage, scoredColumns } from './scoring'
import { persist } from './persist'
import { POSITIONS, DEFAULT_SLOTS, assignRoster, openSlots } from './roster'
import { detectKeyColumn, detectTeamColumn, dedupeKey, computeKeys, reconcileKeys } from './identity'

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
	list_names: {}
});

const PLAYER_LISTS = ['my_team', 'taken_players', 'watch_list'];
export const LIST_LABELS = { my_team: 'My Team', taken_players: 'Taken', watch_list: 'Watch List' };

const toNumber = function(value) {
	if (value === '' || value === null || typeof value === 'undefined') return 0;
	const n = Number(value);
	return isNaN(n) ? 0 : n;
};

// Look up full player rows for a list of player keys, skipping keys not in the current data
const playersForKeys = function(keyRows, keys) {
	return keys.map(key => keyRows.get(key)).filter(Boolean);
};

export const usePickerStore = defineStore('picker', {
	state: defaultState,

	getters: {
		keyColumns: (state) => {
			return state.columns.filter(function(column, index) {
				return state.config.key_columns.includes(index);
			});
		},
		activeCategoryName: (state) => {
			if (state.active_category == 'total') {
				return 'Total score';
			} else {
				return state.columns[state.active_category];
			}
		},

		// Player identity: row -> key and key -> row for the current data
		rowKeys: (state) => computeKeys(state.players, state.columns, state.config),
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

		// List entries whose player isn't in the current data: ambiguous (pick one) or missing
		listIssues() {
			if (this.players.length === 0) {
				return [];
			}
			const config = this.config;
			const teamColumn = detectTeamColumn(this.columns);
			const keys = [...new Set(PLAYER_LISTS.flatMap(list => this[list]))].filter(key => !this.keyRows.has(key));
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

		// My team with lineup eligibility and overall score, for roster slot assignment
		rosterPlayers() {
			const config = this.config;
			const scoreByKey = new Map(this.scores.map(score => [score.playerKey, score.scoreData.total]));
			const ir = new Set(this.ir_players);
			return playersForKeys(this.keyRows, this.my_team).map(player => {
				const key = this.rowKeys.get(player);
				const position = player[config.pos_column];
				const extra = this.position_overrides[key] || [];
				return {
					key: key,
					name: player[config.name_column],
					position: position,
					positions: POSITIONS.filter(p => p === position || extra.includes(p)),
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
			const position_column = state.config.pos_column;
			const name_column = state.config.name_column;
			const rowKeys = this.rowKeys;

			if (state.active_position !== 'all') {
				players = players.filter(player => player[position_column] == state.active_position);
			}
			players = filterByAvailability(state, players, player => rowKeys.get(player));
			if (state.search_text !== '') {
				const needle = state.search_text.toLowerCase();
				players = players.filter(player => player[name_column].toLowerCase().includes(needle));
			}
			return players;
		},

		// Filtered scores without sorting (used by best/worst and summaries)
		filteredScores: (state) => {
			let scores = state.scores;

			if (state.active_position !== 'all') {
				scores = scores.filter(p => p.playerPosition == state.active_position);
			}
			if (state.search_text !== '') {
				const needle = state.search_text.toLowerCase();
				scores = scores.filter(p => p.playerName.toLowerCase().includes(needle));
			}
			return filterByAvailability(state, scores, p => p.playerKey);
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
		// Lists carry over: entries are matched to the new data by player key (see identity.js).
		// Returns { ambiguous, missing } counts of list entries that need attention.
		importPlayers(importData) {
			this.columns = importData[0];
			this.config.key_column = detectKeyColumn(this.columns);
			this.setPlayers(importData.slice(1));
			this.reconcileLists();
			this.evaluatePlayers();
			const issues = this.listIssues;
			return {
				ambiguous: issues.filter(issue => issue.status === 'ambiguous').length,
				missing: issues.filter(issue => issue.status === 'missing').length
			};
		},
		setPlayers(players) {
			const config = this.config;
			const nameColumn = config.name_column;
			const gamesCol = this.config.games_column;
			const minutesCol = this.config.minutes_column;
			const keyCols = this.config.key_columns;
			const totalCols = this.config.yearly_total_columns;
			let cleanPlayers = [];
			const seen = new Set();
			players.forEach(function(player) {

				// Skip blank lines (e.g. a trailing newline in the CSV)
				if (!player[nameColumn]) {
					return;
				}

				// The same player can appear on several rows (e.g. traded); keep the first
				const identity = dedupeKey(player, config);
				if(!seen.has(identity)){
					seen.add(identity);

					// Fix player names: only trim if a backslash exists, otherwise keep as-is
					let name = player[nameColumn];
					if (typeof name === 'string') {
						let junk = name.indexOf('\\');
						let cleanName = (junk >= 0) ? name.substring(0, junk) : name;
						// Set the new name (trim stray whitespace)
						player[nameColumn] = cleanName.trim();
					}

					// Coerce core numeric fields once
					player[gamesCol] = toNumber(player[gamesCol]);
					player[minutesCol] = toNumber(player[minutesCol]);
					// Coerce key and totals columns to numbers
					keyCols.forEach(col => { player[col] = toNumber(player[col]); });
					totalCols.forEach(col => { player[col] = toNumber(player[col]); });

					const gamesPlayed = player[gamesCol];

					// Adjust the yearly totals to per-game safely
					totalCols.forEach(function(column) {
						const val = player[column];
						player[column] = gamesPlayed > 0 ? roundFloat(val / gamesPlayed, 4) : 0;
					});
					cleanPlayers.push(player);
				}
			});

			this.players = markRaw(cleanPlayers);
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
		// Every setting change re-scores immediately (evaluating takes a few tens of ms)
		changeConfigSetting({ config_key, config_value }) {
			this.config[config_key] = config_value;
			this.evaluatePlayers();
		},
		evaluatePlayers() {
			const config = this.config;

			// Calculate and store the baseline average for every scored column (key categories plus ranking-only)
			const averages = {};
			scoredColumns(config).forEach(column => {
				averages[column] = categoryAverage(this.players, column, config);
			});
			this.column_averages = averages;

			// Ranking by a column that is no longer scored falls back to the overall score
			if (this.active_category !== 'total' && !(this.active_category in averages)) {
				this.active_category = 'total';
			}

			// Score each player who has played at least the minimum games and minutes
			const rowKeys = this.rowKeys;
			this.scores = markRaw(this.players.filter(player => meetsMinimums(player, config)).map(player => {
				const scoreData = playerRanking(player, config, averages);
				scoreData.aboveAverage = countAboveAverage(scoreData, config.key_columns);
				return {
					playerKey: rowKeys.get(player),
					scoreData: scoreData,
					playerName: player[config.name_column],
					playerPosition: player[config.pos_column],
					playerGames: player[config.games_column]
				};
			}));
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
};

// The app's single store instance, with persistence attached on first use
let store;
export const useStore = function() {
	if (!store) {
		store = usePickerStore(pinia);
		persist(store);
		markRowsRaw(store);
		// Re-score saved players so scores always match the current scoring logic and settings
		if (store.players.length > 0) {
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
