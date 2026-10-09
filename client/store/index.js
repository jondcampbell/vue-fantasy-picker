import { createStore } from 'vuex'
import { roundFloat, meetsMinimums, categoryAverage, playerRanking, countAboveAverage, scoredColumns } from './scoring'
import { persistPlugin } from './persist'

const state = {
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
	watch_list: []
};

const mutations = {
	SET_COLUMNS(state, columns) {
		state.columns = columns;
	},
	SET_PLAYERS(state, players) {

		const nameColumn = state.config.name_column;
		const idColumn = state.config.id_column;
		const gamesCol = state.config.games_column;
		const minutesCol = state.config.minutes_column;
		const keyCols = state.config.key_columns;
		const totalCols = state.config.yearly_total_columns;
		let cleanPlayers = [];
		players.forEach(function(player) {

			// Normalize id to number early
			const rawId = player[idColumn];
			const normalizedId = parseInt(rawId);

			let cleanPlayerIndex = cleanPlayers.findIndex(function(cleanPlayer) {
				return parseInt(cleanPlayer[idColumn]) === normalizedId;
			});

			if(cleanPlayerIndex < 0){
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

		state.players = cleanPlayers;
	},
	CHANGE_SCREEN(state, screen) {
		state.config.screen =  screen;
	},
	CHANGE_ACTIVE_CATEGORY(state,category) {
		state.active_category = category;
	},
	CHANGE_ACTIVE_POSITION(state,position) {
		state.active_position = position;
	},
	CHANGE_ACTIVE_FILTER(state,filter) {
		state.active_filter = filter;
	},
	CHANGE_SEARCH_TEXT(state,search_text) {
		state.search_text = search_text;
	},
	RESET_SCORES(state){
		state.scores = [];
	},
	SET_SCORE(state, {playerId, playerDetails}) {
		// Find existing player index if it exists
		let playerIndex =  state.scores.findIndex(function(player, index) {
			return player[state.config.id_column] == playerId;
		});

		if (playerIndex >= 0) {
			// Update the score for the player
			state.scores[playerIndex] = playerDetails;
		} else {
			// Add a new score player
			state.scores.push(playerDetails);
		}

	},
	SET_COLUMN_AVERAGE(state, {column, average}) {
		state.column_averages[column] = average;
	},
	SET_CONFIG_OPTION(state, {config_key, config_value}) {
		state.config[config_key] = config_value;
	},
	ADD_TO_LIST(state, {list, player_id}) {
		if( findPlayerIndexInList( state[list], player_id ) === false ) {
			state[list].push(player_id);
		}
	},
	REMOVE_FROM_LIST(state, {list, player_id}) {

		state[list] = state[list].filter(player => {
			return player !== player_id;
		});
	},
	RESET_LISTS(state){
		state.taken_players = [];
		state.my_team = [];
		state.watch_list = [];
	}
};

const actions = {
	importPlayers({ commit, state }, importData) {

		commit('RESET_LISTS');
		let first_row = importData[0];
		commit('SET_COLUMNS', first_row);
		importData.shift();

		let players = importData;
		commit('SET_PLAYERS', players);
	},
	changeScreen({ commit, state }, newScreen) {
		if (state.config.screen != newScreen) {
			commit('CHANGE_SCREEN', newScreen);
		}
	},
	changeActiveCategory({ commit, state }, category) {
		if (state.active_category != category) {
			commit('CHANGE_ACTIVE_CATEGORY', category);
		}
	},
	changeActivePosition({ commit, state }, position) {
		if (state.active_position != position) {
			commit('CHANGE_ACTIVE_POSITION', position);
		}
	},
	changeActiveFilter({ commit, state }, filter) {
		if (state.active_filter != filter) {
			commit('CHANGE_ACTIVE_FILTER', filter);
		}
	},
	changeSearchText({ commit, state }, search_text) {
		if (state.search_text != search_text) {
			commit('CHANGE_SEARCH_TEXT', search_text);
		}
	},
	addToList({ commit, state }, { list, player_id }) {
		commit('ADD_TO_LIST', {
			list: list,
			player_id: parseInt(player_id),
		});
	},
	removeFromList({ commit, state }, { list, player_id }) {
		commit('REMOVE_FROM_LIST', {
			list: list,
			player_id: parseInt(player_id),
		});
	},
	changeConfigSetting({ commit, state }, { config_key, config_value }) {
		commit('SET_CONFIG_OPTION', {
			config_key: config_key,
			config_value: config_value,
		});
	},
	evaluatePlayers({ commit, state, dispatch }) {

		commit('RESET_SCORES');

		// Loop every scored column (key categories plus ranking-only)
		scoredColumns(state.config).forEach(function(column,index) {
			// Calculate the baseline average for each category and store it
			let catAverage = store.getters.categoryAverage(column);

			// Store the catAverage
			commit('SET_COLUMN_AVERAGE', {column: column, average: catAverage});
		});

		// Loop through each player
		state.players.forEach(function(player,index) {
			// If the player has played at least the minimum games and minutes
			if (meetsMinimums(player, state.config)) {
				dispatch('scorePlayer', player);
			}
		})

	},
	scorePlayer({ commit, state, dispatch }, player) {

		// Create the player
		const playerId = player[state.config.id_column];

		// Calculate the players score for each key category to create rankings object
		const scoreData = store.getters.relativePlayerRanking(player);


		let playerName = player[store.state.config.name_column];
		let playerPosition = player[store.state.config.pos_column];
		let playerGames = player[store.state.config.games_column];

		let playerDetails = {
			playerId : playerId,
			scoreData : scoreData,
			playerName: playerName,
			playerPosition: playerPosition,
			playerGames: playerGames
		};

		playerDetails.scoreData.aboveAverage = store.getters.countAboveAverageRanks(scoreData);

		// Store the score for the player
		commit('SET_SCORE', {
			playerId: playerId,
			playerDetails: playerDetails,
		});

	},
	topPlayers({ commit, state, dispatch }, category) {

	}
};

const getters = {
	relativePlayerRanking: (state) => (player) => {
		return playerRanking(player, state.config, state.column_averages);
	},
	countAboveAverageRanks: (state) => (scores) => {
		return countAboveAverage(scores, state.config.key_columns);
	},
	getPlayerGroupSize: (state) => {
		return state.config.teams_in_league * state.config.players_per_team;
	},
	categoryAverage: (state) => (category) => {
		return categoryAverage(state.players, category, state.config);
	},
	sortedFilteredPlayerScores: (state, getters) => {
		// Make a copy of the array
		let scores = state.scores.concat();
		let active_category = state.active_category;
		let active_filter = state.active_filter;
		let active_position = state.active_position;
		let search_text = state.search_text;

		if(active_position !== 'all'){
			scores =  scores.filter(player => {
				return player.playerPosition == active_position;
			});
		}

		if(search_text !== ''){
			scores =  scores.filter(player => {
				if(player.playerName.toLowerCase().includes(search_text.toLowerCase())){
					return true;
				}
				return false;
			});
		}

		const unavailable_players = [...state.taken_players,...state.my_team];
		if(active_filter == 'untaken'){
			scores =  scores.filter(player => {

				if(findPlayerIndexInList(unavailable_players, player.playerId) !== false){
					return false;
				} else {
					return true;
				}

			});
		}
		if(active_filter == 'mine'){
			scores =  scores.filter(player => {

				if(findPlayerIndexInList(state.my_team, player.playerId) !== false){
					return true;
				} else {
					return false;
				}

			});
		}
		if(active_filter == 'watch'){
			scores =  scores.filter(player => {

				if(findPlayerIndexInList(state.watch_list, player.playerId) !== false){
					return true;
				} else {
					return false;
				}

			});
		}
		if(active_filter == 'taken'){
			scores =  scores.filter(player => {

				if(findPlayerIndexInList(state.taken_players, player.playerId) !== false){
					return true;
				} else {
					return false;
				}

			});
		}

		//Sort the players scores
		let sortedPlayers = scores.sort(function(a, b) {
			return b.scoreData[active_category] - a.scoreData[active_category];
		});

		return sortedPlayers;
	},
	filteredPlayers: (state, getters) => {
		let players = state.players;
		let active_position = state.active_position;
		let active_filter = state.active_filter;
		let position_column = state.config.pos_column;
		let name_column = state.config.name_column;
		let id_column = state.config.id_column;
		let search_text = state.search_text;

		if(active_position !== 'all'){
			players =  players.filter(player => {
				return player[position_column] == active_position;
			});
		}
		const unavailable_players = [...state.taken_players,...state.my_team];

		if(active_filter == 'untaken'){
			players =  players.filter(player => {

				if(findPlayerIndexInList(unavailable_players, player[id_column]) !== false){
					return false;
				} else {
					return true;
				}

			});
		}
		if(active_filter == 'mine'){
			players =  players.filter(player => {

				if(findPlayerIndexInList(state.my_team, player[id_column]) !== false){
					return true;
				} else {
					return false;
				}

			});
		}
		if(active_filter == 'taken'){
			players =  players.filter(player => {

				if(findPlayerIndexInList(state.taken_players, player[id_column]) !== false){
					return true;
				} else {
					return false;
				}

			});
		}

		if(search_text !== ''){
			players =  players.filter(player => {
				if(player[name_column].toLowerCase().includes(search_text.toLowerCase())){
					return true;
				}
				return false;
			});
		}

		return players;
	},
	myPlayers: (state, getters) => {
		let players = state.players;
		let my_team = state.my_team;

		let my_team_details = [];
		if(state.scores.length > 0){
			my_team.forEach(playerId => {
				let playerIndex = state.players.findIndex(function(player, index) {
					return player[state.config.id_column] == playerId;
				});
				my_team_details.push(players[playerIndex]);
			});
		}

		return my_team_details;
	},
	takenPlayers: (state, getters) => {
		let players = state.players;
		let taken_players = state.taken_players;

		let taken_players_details = [];
		if(state.scores.length > 0) {
            taken_players.forEach(playerId => {
                let playerIndex = state.players.findIndex(function (player, index) {
                    return player[state.config.id_column] == playerId;
                });
                if(playerIndex >= 0){
                	taken_players_details.push(players[playerIndex]);
				}
            });
        }

		return taken_players_details;
	},
	watchList: (state, getters) => {
		let players = state.players;
		let watch_list = state.watch_list;

		let watch_list_details = [];
		watch_list.forEach(playerId => {
			let playerIndex = state.players.findIndex(function(player, index) {
				return player[state.config.id_column] == playerId;
			});
			watch_list_details.push(players[playerIndex]);
		});

		return watch_list_details;
	},
	sortedPlayerScores: (state, getters) => (category) => {
		// Make a copy of the array
		let scores = state.scores.concat();

		//Sort the players scores
		let sortedPlayers = scores.sort(function(a, b) {
			return b.scoreData[category] - a.scoreData[category];
		});

		return sortedPlayers;
	},
	keyColumns: (state, getters) => {
		return state.columns.filter(function(column, index) {
			// Check if this player has played enough games
			return state.config.key_columns.includes(index);
		});
	},
	activeCategoryName: (state, getters) => {
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
	isWatched: (state, getters) => (id) => getters.watchedSet.has(parseInt(id)),
	isOnTeam: (state, getters) => (id) => getters.myTeamSet.has(parseInt(id)),
	isTaken: (state, getters) => (id) => getters.takenSet.has(parseInt(id)),

	// Filtered scores without sorting (used by best/worst and summaries)
	filteredScores: (state) => {
		let scores = state.scores.concat();
		const active_filter = state.active_filter;
		const active_position = state.active_position;
		const search_text = state.search_text;

		if (active_position !== 'all') {
			scores = scores.filter(p => p.playerPosition == active_position);
		}
		if (search_text !== '') {
			const needle = search_text.toLowerCase();
			scores = scores.filter(p => p.playerName.toLowerCase().includes(needle));
		}
		if (active_filter === 'untaken') {
			const unavailable = new Set([...state.taken_players, ...state.my_team]);
			scores = scores.filter(p => !unavailable.has(p.playerId));
		} else if (active_filter === 'mine') {
			const mine = new Set(state.my_team);
			scores = scores.filter(p => mine.has(p.playerId));
		} else if (active_filter === 'watch') {
			const watch = new Set(state.watch_list);
			scores = scores.filter(p => watch.has(p.playerId));
		} else if (active_filter === 'taken') {
			const taken = new Set(state.taken_players);
			scores = scores.filter(p => taken.has(p.playerId));
		}
		return scores;
	},

	// Precompute best/worst for current filtered set
	bestScores: (state, getters) => {
		const list = getters.filteredScores;
		const result = {};
		scoredColumns(state.config).forEach(col => {
			let max = undefined;
			for (const player of list) {
				const val = player.scoreData[col];
				if (max === undefined || val > max) max = val;
			}
			if (max !== undefined) result[col] = max;
		});
		return result;
	},
	worstScores: (state, getters) => {
		const list = getters.filteredScores;
		const result = {};
		scoredColumns(state.config).forEach(col => {
			let min = undefined;
			for (const player of list) {
				const val = player.scoreData[col];
				if (min === undefined || val < min) min = val;
			}
			if (min !== undefined) result[col] = min;
		});
		return result;
	},

	// TODO: Might not need this one
	getConfigValue: (state, getters) => (config_key) => {
		return state.config[config_key];
	}
};

const store = createStore({
	state,
	mutations,
	actions,
	getters,
	plugins: [persistPlugin]
});

const toNumber = function(value) {
	if (value === '' || value === null || typeof value === 'undefined') return 0;
	const n = Number(value);
	return isNaN(n) ? 0 : n;
};

const findPlayerIndexInList = function(list,player_id){
	const playerIndex = list.indexOf(parseInt(player_id));
	if(playerIndex >= 0){
		return playerIndex;
	} else {
		return false;
	}
};

export default store;