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
                        Positions: {{ positions }}
                    </div>


                </div>
                <div class="col-6" v-if="$store.state.columns.length > 0">
                    <h5>Columns</h5>
                    <div class="form-group">
                        Name Column:
                        <select class="form-control" v-bind:value="name_column"  v-on:change="changeNameColumn">
                            <option v-for="(column, index) in available_columns" v-bind:value="index">{{column}} (Column {{index}})</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Position Column:
                        <select class="form-control" v-bind:value="pos_column"  v-on:change="changePosColumn">
                            <option v-for="(column, index) in available_columns" v-bind:value="index">{{column}} (Column {{index}})</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Games Column:
                        <select class="form-control" v-bind:value="games_column"  v-on:change="changeGamesColumn">
                            <option v-for="(column, index) in available_columns" v-bind:value="index">{{column}} (Column {{index}})</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Key Columns:
                        <select class="form-control" id="key_columns" v-bind:value="key_columns"  v-on:change="changeKeyColumns" multiple>
                            <option v-for="(column, index) in available_columns" v-bind:value="index">{{column}} (Column {{index}})</option>
                        </select>
                    </div>

                    Key Columns: {{ $store.state.config.key_columns }}<br />
                    <div class="form-group">
                        Negative Columns:
                        <select class="form-control" v-bind:value="negative_columns"  v-on:change="changeNegativeColumns" multiple>
                            <option v-for="(column, index) in available_columns" v-bind:value="index">{{column}} (Column {{index}})</option>
                        </select>
                    </div>
                    Negative Columns: {{ $store.state.config.negative_columns }}<br />
                    <div class="form-group">
                        Yearly Total Columns:
                        <select class="form-control" v-bind:value="yearly_total_columns"  v-on:change="changeYearlyTotalColumns" multiple>
                            <option v-for="(column, index) in available_columns" v-bind:value="index">{{column}} (Column {{index}})</option>
                        </select>
                    </div>
                    Yearly Total Columns: {{ $store.state.config.yearly_total_columns }}<br />
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
            changeNameColumn: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'name_column', config_value: parseInt(e.target.value) });
            },
            changePosColumn: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'pos_column', config_value: parseInt(e.target.value) });
            },
            changeGamesColumn: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'games_column', config_value: parseInt(e.target.value) });
            },
            changeKeyColumns: function(e) {
                console.log(e.target);
                this.$store.dispatch('changeConfigSetting',{ config_key: 'key_columns', config_value: parseInt(e.target.value) });
            },
            changeNegativeColumns: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'negative_columns', config_value: parseInt(e.target.value) });
            },
            changeYearlyTotalColumns: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'yearly_total_columns', config_value: parseInt(e.target.value) });
            }
        },
        computed: {
            positions: function () {
                let positions = this.$store.state.config.positions;
                return positions.join(',');
            },
            ...mapState({
                average_mode: state => state.config.average_mode,
                teams_in_league: state => state.config.teams_in_league,
                players_per_team: state => state.config.players_per_team,
                top_players: state => state.config.top_players,
                min_games_played: state => state.config.min_games_played,

                name_column: state => state.config.name_column,
                pos_column: state => state.config.pos_column,
                games_column: state => state.config.games_column,
                key_columns: state => state.config.key_columns,
                negative_columns: state => state.config.negative_columns,
                yearly_total_columns: state => state.config.yearly_total_columns,

                available_columns: state => state.columns
            })
        }
    }
</script>

<style lang="scss">
    .config-wrapper {
    }
</style>
