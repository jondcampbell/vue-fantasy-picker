import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const state = {
    count: 0,
    config: {
        top_players: 5,
        average_mode: 1
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
    }
};

const store = new Vuex.Store({
    state,
    mutations,
    actions
});

export default store
