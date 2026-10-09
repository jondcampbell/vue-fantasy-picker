import { markRaw, toRaw } from 'vue'
import { createPinia, defineStore } from 'pinia'
import { roundFloat, meetsMinimums, categoryAverage, playerRanking, countAboveAverage, scoredColumns } from './scoring'
import { persist } from './persist'
import { POSITIONS, DEFAULT_SLOTS, assignRoster, openSlots } from './roster'

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
	my_team: [],
	taken_players: [],
	watch_list: [],
	// player id -> extra positions the league allows beyond the CSV position
	position_overrides: {},
	// my team players parked in IR slots
	ir_players: []
});

const toNumber = function(value) {
	if (value === '' || value === null || typeof value === 'undefined') return 0;
	const n = Number(value);
	return isNaN(n) ? 0 : n;
};

// Look up full player rows for a list of player ids, skipping ids no longer in the data
const playersForIds = function(state, ids) {
	const idColumn = state.config.id_column;
	const byId = new Map(state.players.map(player => [player[idColumn], player]));
	return ids.map(id => byId.get(id)).filter(Boolean);
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

		// Fast lookup sets for list membership
		watchedSet: (state) => new Set(state.watch_list),
		myTeamSet: (state) => new Set(state.my_team),
		takenSet: (state) => new Set(state.taken_players),
		isWatched() {
			return (id) => this.watchedSet.has(parseInt(id));
		},
		isOnTeam() {
			return (id) => this.myTeamSet.has(parseInt(id));
		},
		isTaken() {
			return (id) => this.takenSet.has(parseInt(id));
		},

		// My team with lineup eligibility and overall score, for roster slot assignment
		rosterPlayers: (state) => {
			const config = state.config;
			const scoreById = new Map(state.scores.map(score => [score.playerId, score.scoreData.total]));
			const ir = new Set(state.ir_players);
			return playersForIds(state, state.my_team).map(player => {
				const id = player[config.id_column];
				const position = player[config.pos_column];
				const extra = state.position_overrides[id] || [];
				return {
					id: id,
					name: player[config.name_column],
					position: position,
					positions: POSITIONS.filter(p => p === position || extra.includes(p)),
					score: scoreById.get(id),
					ir: ir.has(id)
				};
			});
		},
		roster() {
			return assignRoster(this.rosterPlayers, this.config.roster_slots);
		},
		openRosterSlots() {
			return openSlots(this.roster.assignments);
		},

		myPlayers: (state) => state.scores.length > 0 ? playersForIds(state, state.my_team) : [],
		takenPlayers: (state) => state.scores.length > 0 ? playersForIds(state, state.taken_players) : [],
		watchList: (state) => playersForIds(state, state.watch_list),

		// Raw player rows filtered by the active position, availability and search
		filteredPlayers: (state) => {
			let players = state.players;
			const position_column = state.config.pos_column;
			const name_column = state.config.name_column;
			const id_column = state.config.id_column;

			if (state.active_position !== 'all') {
				players = players.filter(player => player[position_column] == state.active_position);
			}
			players = filterByAvailability(state, players, player => player[id_column]);
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
			return filterByAvailability(state, scores, p => p.playerId);
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
		importPlayers(importData) {
			this.resetLists();
			this.columns = importData[0];
			this.setPlayers(importData.slice(1));
			this.evaluatePlayers();
		},
		setPlayers(players) {
			const nameColumn = this.config.name_column;
			const idColumn = this.config.id_column;
			const gamesCol = this.config.games_column;
			const minutesCol = this.config.minutes_column;
			const keyCols = this.config.key_columns;
			const totalCols = this.config.yearly_total_columns;
			let cleanPlayers = [];
			const seenIds = new Set();
			players.forEach(function(player) {

				// Normalize id to number early
				const normalizedId = parseInt(player[idColumn]);

				// The same player can appear on several rows (e.g. traded); keep the first
				if(!seenIds.has(normalizedId)){
					seenIds.add(normalizedId);

					// Fix player names: only trim if a backslash exists, otherwise keep as-is
					let name = player[nameColumn];
					if (typeof name === 'string') {
						let junk = name.indexOf('\\');
						let cleanName = (junk >= 0) ? name.substring(0, junk) : name;
						// Set the new name (trim stray whitespace)
						player[nameColumn] = cleanName.trim();
					}

					// Coerce core numeric fields once
					player[idColumn] = normalizedId;
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
		addToList({ list, player_id }) {
			const id = parseInt(player_id);
			if (!this[list].includes(id)) {
				this[list].push(id);
			}
		},
		removeFromList({ list, player_id }) {
			const id = parseInt(player_id);
			this[list] = this[list].filter(player => player !== id);
			if (list === 'my_team') {
				this.ir_players = this.ir_players.filter(player => player !== id);
			}
		},
		resetLists() {
			this.taken_players = [];
			this.my_team = [];
			this.watch_list = [];
			this.position_overrides = {};
			this.ir_players = [];
		},
		// Add or remove an extra position the league lets this player fill
		togglePositionOverride({ player_id, position }) {
			const id = parseInt(player_id);
			const current = this.position_overrides[id] || [];
			const next = current.includes(position) ? current.filter(p => p !== position) : [...current, position];
			const overrides = { ...this.position_overrides };
			if (next.length > 0) {
				overrides[id] = next;
			} else {
				delete overrides[id];
			}
			this.position_overrides = overrides;
		},
		toggleIr(player_id) {
			const id = parseInt(player_id);
			this.ir_players = this.ir_players.includes(id)
				? this.ir_players.filter(player => player !== id)
				: [...this.ir_players, id];
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
			this.scores = markRaw(this.players.filter(player => meetsMinimums(player, config)).map(player => {
				const scoreData = playerRanking(player, config, averages);
				scoreData.aboveAverage = countAboveAverage(scoreData, config.key_columns);
				return {
					playerId: player[config.id_column],
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
