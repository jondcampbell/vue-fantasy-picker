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
			26
		],
		key_columns:[
			10,
			11,
			20,
			23,
			24,
			25,
			26,
			27,
			29
		], // Hardcoded for now
		games_column: 5, // Hardcoded for now
		pos_column: 2 // Hardcoded for now
		// TODO: Add in array of columns that are for total season and need to be converted to per game
	},
	players: [],
	columns: [],
	column_averages:{},
	scores: []
};

const mutations = {
	SET_COLUMNS(state, columns) {
		state.columns = columns;
	},
	SET_PLAYERS(state, players) {
		// TODO Loop players and get rid of the \whatever in the names

		// TODO: convert some stats to be divided by the games played
		state.players = players;
	},
	CHANGE_SCREEN(state, screen) {
		state.config.screen =  screen;
	},
	SET_SCORE(state, {playerId, score}) {
		// Find existing player index if it exists
		let playerIndex =  state.scores.findIndex(function(player, index) {
			return player[0] == playerId;
		});

		if (playerIndex >= 0) {
			// Update the score for the player
			state.scores[playerIndex] = score;
		} else {
			// Add a new score player
			state.scores.push(score);
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
		if ( state.config.screen != newScreen) {
			commit('CHANGE_SCREEN', newScreen);
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

		let score = {};
		score.playerId = playerId;
		score.scoreData = scoreData;

		const aboveAverage = store.getters.countAboveAverageRanks(scoreData);
		score.scoreData.aboveAverage = aboveAverage;

		// Store the score for the player
		commit('SET_SCORE', {playerId: playerId, score: score});

	},
	topPlayers({ commit, state, dispatch }, category) {

	}
};

const getters = {
	relativePlayerRankingForCat: (state, getters) => (player, category) => {
		// TODO: Make sure we are accounting for negative columns

		let playerValue = player[category];

		if (player[category] == '') {
			playerValue = 0;
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

		// TODO: Maybe record a count of how many categories were over the average

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
	playerTotalScore(playerId) {
		// Add up the score for the player
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