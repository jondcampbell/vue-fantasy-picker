import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const state = {
    config: {
        top_players: 5,
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
    columns: []
};

const mutations = {
    SET_COLUMNS(state, columns){
        console.log(columns);
        state.columns = columns;
    },
    SET_PLAYERS(state, players){
        console.log(players);
        // Loop players and get rid of the \whatever in the names

        state.players = players;
    },
    CHANGE_SCREEN(state, screen){
        state.config.screen =  screen;
    }
};

const actions = {
    importPlayers ({ commit, state }, importData ) {

        let first_row = importData[0];
        commit('SET_COLUMNS', first_row);
        importData.shift();

        let players = importData;
        commit('SET_PLAYERS', players);
        console.log(players);
    },
    changeScreen ({ commit, state }, newScreen ) {
        if ( state.config.screen != newScreen ) {
            commit('CHANGE_SCREEN', newScreen);
        }
    }
};

const store = new Vuex.Store({
    state,
    mutations,
    actions
});

export default store
