<template>
    <div class="config-wrapper">
        <h2>Configure</h2>
        <form>
            <section class="row ">
                <div class="col-6">
                    <h5>General</h5>
                    <div class="form-group">
                        Average Mode:
                        <select class="form-control" v-bind:value="average_mode" v-on:change="changeAverageMode">
                            <option value="1">Default</option>
                        </select>
                    </div>
                    <div class="form-group">
                        Teams in League: <input class="form-control" type="number" v-bind:value="teams_in_league" v-on:input="changeTeamsInLeague"/>
                    </div>
                    <div class="form-group">
                        Players per team: <input class="form-control" type="number" v-bind:value="players_per_team" v-on:input="changePlayersPerTeam"/>
                    </div>
                    <div class="form-group">
                        Top Players: <input class="form-control" type="number" v-bind:value="top_players" v-on:input="changeTopPlayers"/>
                    </div>
                    <div class="form-group">
                        Minimum Games Played: <input class="form-control" type="number" v-bind:value="min_games_played" v-on:input="changeMinGamesPlayed"/>
                    </div>
                    <div class="form-group">
                        Minimum Minutes Played per Game: <input class="form-control" type="number" v-bind:value="min_minutes_played" v-on:input="changeMinMinutesPlayed"/>
                    </div>
                    <div class="form-group">
                        Positions: {{ positions }}
                    </div>


                </div>
                <div class="col-6" v-if="$store.state.columns.length > 0">
                    <h5>Columns</h5>
                    <div class="form-group">
                        Name Column:
                        <multiselect @input="changeNameColumn" v-bind:value="name_column" placeholder="Select Name Column" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :taggable="false" ></multiselect>
                    </div>

                    <div class="form-group">
                        Position Column:
                        <multiselect @input="changePosColumn" v-bind:value="pos_column" placeholder="Select Position Column" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :taggable="false" ></multiselect>
                    </div>

                    <div class="form-group">
                        Games Played Column:
                        <multiselect @input="changeGamesColumn" v-bind:value="games_column" placeholder="Select Games Played Column" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :taggable="false" ></multiselect>
                    </div>

                    <div class="form-group">
                        Minutes Played Column:
                        <multiselect @input="changeMinutesColumn" v-bind:value="minutes_column" placeholder="Select Minutes Played Column" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :taggable="false" ></multiselect>
                    </div>

                    <div class="form-group">
                        Key Positive Columns:
                        <multiselect @input="changeKeyColumns" v-bind:value="key_columns" placeholder="Select Key Columns" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :multiple="true" :taggable="false" ></multiselect>
                    </div>

                    <div class="form-group">
                        Key Negative Columns:
                        <multiselect @input="changeNegativeColumns" v-bind:value="negative_columns" placeholder="Select Negative Columns" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :multiple="true" :taggable="false" ></multiselect>
                    </div>

                    <div class="form-group">
                        Yearly Total Based Columns:
                        <multiselect @input="changeYearlyTotalColumns" v-bind:value="yearly_total_columns" placeholder="Select Yearly Total Columns" :show-labels="false" :options="available_columns_simple" :custom-label="columnLabel" :multiple="true" :taggable="false" ></multiselect>

                    </div>
                </div>
            </section>
        </form>
    </div>
</template>

<script>
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    import { mapState } from 'vuex';
    import Multiselect from 'vue-multiselect';

    export default {
        methods: {
            changeAverageMode: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'average_mode', config_value: parseInt(e.target.value) });
            },
            changeTeamsInLeague: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'teams_in_league', config_value: parseInt(e.target.value) });
            },
            changePlayersPerTeam: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'players_per_team', config_value: parseInt(e.target.value) });
            },
            changeTopPlayers: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'top_players', config_value: parseInt(e.target.value) });
            },
            changeMinGamesPlayed: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'min_games_played', config_value: parseInt(e.target.value) });
            },
            changeMinMinutesPlayed: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'min_minutes_played', config_value: parseInt(e.target.value) });
            },
            changeNameColumn: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'name_column', config_value: value });
            },
            changePosColumn: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'pos_column', config_value: value });
            },
            changeGamesColumn: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'games_column', config_value: value });
            },
            changeMinutesColumn: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'minutes_column', config_value: value });
            },
            changeNegativeColumns: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'negative_columns', config_value: value });
            },
            changeYearlyTotalColumns: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'yearly_total_columns', config_value: value });
            },
            changeKeyColumns: function(value) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'key_columns', config_value: value });
            },
            columnLabel: function(index) {
                return `${this.$store.state.columns[index]} (Column ${index})`;
            }
        },
        computed: {
            positions: function () {
                let positions = this.$store.state.config.positions;
                return positions.join(',');
            },
            available_columns_simple: function () {
                return this.$store.state.columns.map((column,index) => {
                    return index;
                });
            },
            ...mapState({
                average_mode: state => state.config.average_mode,
                teams_in_league: state => state.config.teams_in_league,
                players_per_team: state => state.config.players_per_team,
                top_players: state => state.config.top_players,
                min_games_played: state => state.config.min_games_played,
                min_minutes_played: state => state.config.min_minutes_played,

                name_column: state => state.config.name_column,
                pos_column: state => state.config.pos_column,
                games_column: state => state.config.games_column,
                minutes_column: state => state.config.minutes_column,
                key_columns: state => state.config.key_columns,
                negative_columns: state => state.config.negative_columns,
                yearly_total_columns: state => state.config.yearly_total_columns,

                available_columns: state => state.columns
            })
        },components: {
            Multiselect
        },
    }
</script>
<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
<style lang="scss">
    .config-wrapper {
    }
</style>