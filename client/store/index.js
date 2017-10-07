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
	},
	players: [],
	columns: [],
	scores: []
};

const mutations = {
	SET_COLUMNS(state, columns) {
		console.log(columns);
		state.columns = columns;
	},
	SET_PLAYERS(state, players) {
		console.log(players);
		// Loop players and get rid of the \whatever in the names

		state.players = players;
	},
	CHANGE_SCREEN(state, screen) {
		state.config.screen =  screen;
	},
	SET_RANKINGS(state, {playerId, rankings}) {
        state.scores[playerId] = rankings;
	}
};

const actions = {
	importPlayers({ commit, state }, importData) {

		let first_row = importData[0];
		commit('SET_COLUMNS', first_row);
		importData.shift();

		let players = importData;
		commit('SET_PLAYERS', players);
		console.log(players);
	},
	changeScreen({ commit, state }, newScreen) {
		if ( state.config.screen != newScreen) {
			commit('CHANGE_SCREEN', newScreen);
		}
	},
	evaluatePlayers({ commit, state, dispatch }) {
		console.log('evaluating');

		// TODO: Calculate the baseline average for each category and store it


		// Loop through each player
		state.players.forEach(function(player,index) {
			dispatch('scorePlayer', player);
		})

	},
	scorePlayer({ commit, state, dispatch }, player) {
		console.log(player);

        // Create the player
        let playerId = player[0];

        // TODO: Figure out why the first player in scores table is undefined

        // TODO: Calculate the players score for each key category to create rankings object

        let rankings = {
            0: 55,
            1:2
        };
        // Store the rankings for the player
        commit('SET_RANKINGS', {playerId: playerId, rankings: rankings});

	}
};

const store = new Vuex.Store({
	state,
	mutations,
	actions
});

export default store;
