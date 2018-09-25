import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const state = {
	config: {
		top_players: 5,
		teams_in_league:12,
		players_per_team:13,
		average_mode: 1,
		screen:1,
		name_column:1, // Hardcoded for now
		min_games_played: 10,
		negative_columns: [
			27
		],
		positions: [
			'SG',
			'PG',
			'C',
			'PF',
			'SF'
		],
		yearly_total_columns: [
			11,
			23,
			24,
			25,
			//26,
			//27,
			29
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
		], // Hardcoded for now
		games_column: 5, // Hardcoded for now
		pos_column: 2 // Hardcoded for now
	},
	players: [],
	columns: [],
	column_averages:{},
	scores: [],
	active_category: 'total',
	active_position: 'all'
};

const mutations = {
	SET_COLUMNS(state, columns) {
		state.columns = columns;
	},
	SET_PLAYERS(state, players) {

		let nameColumn = state.config.name_column;
		players.forEach(function(player,playerIndex) {
			// Fix player names
			let name = player[nameColumn];
			let junk = name.indexOf('\\');
			let cleanName = name.substring(0, junk);

			// Set the new name
			players[playerIndex][nameColumn] = cleanName;

			let gamesPlayed = player[state.config.games_column];

			// Adjust the yearly totals to be based on games played
			state.config.yearly_total_columns.forEach(function(column, columnIndex) {
				players[playerIndex][column] = roundFloat(player[column] / gamesPlayed, 4);
			});
		});

		state.players = players;
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
	SET_SCORE(state, {playerId, playerDetails}) {
		// Find existing player index if it exists
		let playerIndex =  state.scores.findIndex(function(player, index) {
			return player[0] == playerId;
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
	}
};

const actions = {
	importPlayers({ commit, state }, importData) {

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
	evaluatePlayers({ commit, state, dispatch }) {

		// Loop our key columns
		state.config.key_columns.forEach(function(column,index) {
			// Calculate the baseline average for each category and store it
			let catAverage = store.getters.categoryAverage(column);

			// Store the catAverage
			commit('SET_COLUMN_AVERAGE', {column: column, average: catAverage});
		});

		// Loop through each player
		state.players.forEach(function(player,index) {
			// If the player has played at least the minimum games number
			if (player[state.config.games_column] >= state.config.min_games_played) {
				dispatch('scorePlayer', player);
			}
		})

	},
	scorePlayer({ commit, state, dispatch }, player) {

		// Create the player
		const playerId = player[0];

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
	relativePlayerRankingForCat: (state, getters) => (player, category) => {

		let playerValue = player[category];

		if (player[category] == '') {
			playerValue = 0;
		}

		if (state.config.negative_columns.indexOf(category) >= 0) {
			playerValue = -playerValue;
		}
		return roundFloat(parseFloat(playerValue) / parseFloat(state.column_averages[category]), 4);
	},
	relativePlayerRanking: (state, getters) => (player) => {
		let rankings = {};

		let rankingsSum = 0;
		// For each key category
		state.config.key_columns.forEach(function(column,index) {

			// Get the players rankings
			let columnScore = getters.relativePlayerRankingForCat(player, column);
			rankings[column] = columnScore;
			rankingsSum = rankingsSum + columnScore;
		});
		let rankingsAverage = rankingsSum / state.config.key_columns.length;

		// TODO: Somehow we need to tone down stats that are too far out of line for players very good at one thing

		rankings.total = roundFloat(rankingsAverage, 4);
		return rankings;
	},
	countAboveAverageRanks: (state,getters) => (scores) => {
		let aboveAverageCount = 0;

		state.config.key_columns.forEach(function(keyColumn,index) {
			let categoryAverage = state.column_averages[keyColumn];

			if (scores[keyColumn] > categoryAverage) {
				aboveAverageCount++;
			}
		});
		return aboveAverageCount;
	},
	getPlayerGroupSize: (state) => {
		let teams = state.config.teams_in_league;
		let playersPerTeam = state.config.players_per_team;

		return teams * playersPerTeam;
	},
	categoryAverage: (state, getters) => (category) => {

		let sortedPlayers = [];

		// Check if the category should be sorted negative
		if (state.config.negative_columns.includes(category)) {
			// Get the top players in this negative category
			sortedPlayers = state.players.sort(function(a, b) {
				return a[category] - b[category];
			});
		} else {
			// Get the top players in this postive category
			sortedPlayers = state.players.sort(function(a, b) {
				return b[category] - a[category];
			});
		}

		let validPlayers = state.players.filter(function(player) {
			// Check if this player has played enough games
			return player[state.config.games_column] >= state.config.min_games_played;
		});

		sortedPlayers = validPlayers.sort(function(a, b) {
			if (state.config.negative_columns.includes(category)) {
				return a[category] - b[category];
			} else {
				return b[category] - a[category];
			}
		});


		let numberOfPlayers = parseInt(getters.getPlayerGroupSize);

		// We shouldn't be expecting more players than our total players we have
		if (numberOfPlayers > sortedPlayers.length) {
			numberOfPlayers = sortedPlayers.length;
		}
		let bestPlayers = sortedPlayers.slice(0, numberOfPlayers);


		let categorySum = 0
		bestPlayers.forEach(function(player,index) {
			let playerValue = player[category];
			if (player[category] == '') {
				playerValue = 0;
			}
			categorySum = parseFloat(categorySum) + parseFloat(playerValue);
		});

		let categoryAverage = categorySum / bestPlayers.length;

		// Round the number to 4 decimals
		categoryAverage = roundFloat(categoryAverage, 4);

		return categoryAverage;
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
	}
};

const store = new Vuex.Store({
	state,
	mutations,
	actions,
	getters
});

const roundFloat = function(value, decimals) {
	return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};

export default store;