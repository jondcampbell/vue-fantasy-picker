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
                        Category average pool:
                        <select class="form-control" :value="String(average_pool_size === undefined ? 'all' : average_pool_size)" @change="changeAveragePoolSize">
                            <option value="all">All (valid players)</option>
                            <option value="100">Top 100</option>
                            <option value="150">Top 150</option>
                            <option value="200">Top 200</option>
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
                        <select class="form-control" :value="name_column" @change="changeNameColumn(parseInt($event.target.value))">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Position Column:
                        <select class="form-control" :value="pos_column" @change="changePosColumn(parseInt($event.target.value))">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Games Played Column:
                        <select class="form-control" :value="games_column" @change="changeGamesColumn(parseInt($event.target.value))">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Minutes Played Column:
                        <select class="form-control" :value="minutes_column" @change="changeMinutesColumn(parseInt($event.target.value))">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Key Positive Columns:
                        <select class="form-control" multiple v-model="keyColumnsModel">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Key Negative Columns:
                        <select class="form-control" multiple v-model="negativeColumnsModel">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        Yearly Total Based Columns:
                        <select class="form-control" multiple v-model="yearlyTotalColumnsModel">
                            <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                        </select>

                    </div>
                </div>
            </section>
        </form>
    </div>
</template>

<script>
    import { mapState } from 'vuex';

    export default {
        methods: {
            changeAverageMode: function(e) {
                this.$store.dispatch('changeConfigSetting',{ config_key: 'average_mode', config_value: parseInt(e.target.value) });
            },
            changeAveragePoolSize: function(e) {
                const raw = e.target.value;
                const value = raw === 'all' ? 'all' : parseInt(raw);
                this.$store.dispatch('changeConfigSetting',{ config_key: 'average_pool_size', config_value: value });
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
            onMultiChange: function(e, key) {
                const values = Array.from(e.target.selectedOptions).map(o => parseInt(o.value));
                this.$store.dispatch('changeConfigSetting',{ config_key: key, config_value: values });
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
            // Two-way bindings for multi-selects
            keyColumnsModel: {
                get() {
                    return this.$store.state.config.key_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.dispatch('changeConfigSetting', { config_key: 'key_columns', config_value: nums });
                }
            },
            negativeColumnsModel: {
                get() {
                    return this.$store.state.config.negative_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.dispatch('changeConfigSetting', { config_key: 'negative_columns', config_value: nums });
                }
            },
            yearlyTotalColumnsModel: {
                get() {
                    return this.$store.state.config.yearly_total_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.dispatch('changeConfigSetting', { config_key: 'yearly_total_columns', config_value: nums });
                }
            },
            ...mapState({
                average_mode: state => state.config.average_mode,
                average_pool_size: state => state.config.average_pool_size,
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
        }
    }
</script>
<style lang="scss">
    .config-wrapper {
    }
</style>