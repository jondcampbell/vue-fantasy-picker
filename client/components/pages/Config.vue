<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">Configure</h2>
            <p class="page-subtitle">Changes re-score players immediately.</p>
        </header>

        <form class="grid gap-5 lg:grid-cols-2" @submit.prevent>
            <section class="card space-y-4 p-5">
                <h3 class="font-semibold">General</h3>

                <div class="grid gap-4 sm:grid-cols-2">
                    <label>
                        <span class="label">Average Mode</span>
                        <select class="field" v-bind:value="average_mode" v-on:change="changeAverageMode">
                            <option value="1">Mean</option>
                            <option value="2">Median</option>
                        </select>
                    </label>
                    <label>
                        <span class="label">Category Average Pool</span>
                        <select class="field" :value="String(average_pool_size === undefined ? 'all' : average_pool_size)" @change="changeAveragePoolSize">
                            <option value="all">All (valid players)</option>
                            <option value="100">Top 100</option>
                            <option value="150">Top 150</option>
                            <option value="200">Top 200</option>
                        </select>
                        <p class="help">How many of the best players in each category form its baseline.</p>
                    </label>
                    <label>
                        <span class="label">Teams in League</span>
                        <input class="field" type="number" min="1" step="1" :value="teams_in_league" @input="setNumber('teams_in_league', 1, $event)" @blur="resetNumber('teams_in_league', $event)"/>
                    </label>
                    <label>
                        <span class="label">Players per Team</span>
                        <input class="field" type="number" min="1" step="1" :value="players_per_team" @input="setNumber('players_per_team', 1, $event)" @blur="resetNumber('players_per_team', $event)"/>
                    </label>
                    <label>
                        <span class="label">Top Players</span>
                        <input class="field" type="number" min="1" step="1" :value="top_players" @input="setNumber('top_players', 1, $event)" @blur="resetNumber('top_players', $event)"/>
                    </label>
                    <label>
                        <span class="label">Minimum Games Played</span>
                        <input class="field" type="number" min="0" step="1" :value="min_games_played" @input="setNumber('min_games_played', 0, $event)" @blur="resetNumber('min_games_played', $event)"/>
                    </label>
                    <label>
                        <span class="label">Minimum Minutes per Game</span>
                        <input class="field" type="number" min="0" step="1" :value="min_minutes_played" @input="setNumber('min_minutes_played', 0, $event)" @blur="resetNumber('min_minutes_played', $event)"/>
                    </label>
                </div>

                <div>
                    <span class="label">Positions</span>
                    <div class="flex flex-wrap gap-1.5">
                        <span class="chip" v-for="position in $store.config.positions" :key="position">{{ position }}</span>
                    </div>
                </div>

                <label class="block">
                    <span class="label">Roster Slots</span>
                    <input class="field" type="text" v-model="rosterSlotsText" @change="saveRosterSlots" :aria-invalid="rosterSlotsError ? 'true' : 'false'"/>
                    <p class="help text-bad" v-if="rosterSlotsError">{{ rosterSlotsError }}</p>
                    <p class="help" v-else>Comma-separated, in lineup order. Use {{ slotTypes }}.</p>
                </label>
            </section>

            <section class="card space-y-4 p-5">
                <h3 class="font-semibold">Columns</h3>

                <p class="text-sm text-muted" v-if="$store.columns.length == 0">Import a CSV to map its columns.</p>

                <template v-else>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span class="label">Name Column</span>
                            <select class="field" :value="name_column" @change="changeNameColumn(parseInt($event.target.value))">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                        </label>
                        <label>
                            <span class="label">Position Column</span>
                            <select class="field" :value="pos_column" @change="changePosColumn(parseInt($event.target.value))">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                        </label>
                        <label>
                            <span class="label">Games Played Column</span>
                            <select class="field" :value="games_column" @change="changeGamesColumn(parseInt($event.target.value))">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                        </label>
                        <label>
                            <span class="label">Minutes Played Column</span>
                            <select class="field" :value="minutes_column" @change="changeMinutesColumn(parseInt($event.target.value))">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                        </label>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <label>
                            <span class="label">Scoring Categories</span>
                            <select class="field" size="10" multiple v-model="keyColumnsModel">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                            <p class="help">Columns that are scored and ranked; set from your league by Sync league.</p>
                        </label>
                        <label>
                            <span class="label">Lower Is Better</span>
                            <select class="field" size="10" multiple v-model="negativeColumnsModel">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                            <p class="help">E.g. turnovers. Applies to scoring and ranking-only columns.</p>
                        </label>
                        <label>
                            <span class="label">Ranking Only</span>
                            <select class="field" size="10" multiple v-model="rankingOnlyColumnsModel">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                            <p class="help">Scored and rankable, but never counted in your overall score, even if it's a scoring category (e.g. a league category you want to ignore). League sync leaves this alone.</p>
                        </label>
                        <label>
                            <span class="label">Season Totals</span>
                            <select class="field" size="10" multiple v-model="yearlyTotalColumnsModel">
                                <option v-for="(col, idx) in available_columns_simple" :key="idx" :value="col">{{ columnLabel(col) }}</option>
                            </select>
                            <p class="help">Season totals in these columns are converted to per-game.</p>
                        </label>
                    </div>
                    <p class="help">Hold ⌘ (or Ctrl) to select multiple columns.</p>
                </template>
            </section>
        </form>
    </div>
</template>

<script>
    import { mapState } from 'pinia';
    import { usePickerStore } from 'store';
    import { parseSlots, SLOT_TYPES } from 'store/roster';

    export default {
        data() {
            return {
                rosterSlotsText: this.$store.config.roster_slots.join(', '),
                rosterSlotsError: '',
                slotTypes: SLOT_TYPES.join(', ')
            };
        },
        methods: {
            saveRosterSlots: function() {
                const { slots, invalid } = parseSlots(this.rosterSlotsText);
                if (invalid.length > 0) {
                    this.rosterSlotsError = `Unknown slot: ${invalid.join(', ')}. Use ${this.slotTypes}.`;
                } else if (slots.length === 0) {
                    this.rosterSlotsError = 'Add at least one slot.';
                } else {
                    this.rosterSlotsError = '';
                    this.$store.changeConfigSetting({ config_key: 'roster_slots', config_value: slots });
                    this.rosterSlotsText = slots.join(', ');
                }
            },
            // Only save whole numbers at or above the minimum; ignore empty or invalid input while typing
            setNumber: function(key, min, e) {
                const value = Number(e.target.value);
                if (e.target.value !== '' && Number.isInteger(value) && value >= min) {
                    this.$store.changeConfigSetting({ config_key: key, config_value: value });
                }
            },
            // On leaving the field, show the saved value again if the input was rejected
            resetNumber: function(key, e) {
                e.target.value = this.$store.config[key];
            },
            changeAverageMode: function(e) {
                this.$store.changeConfigSetting({ config_key: 'average_mode', config_value: parseInt(e.target.value) });
            },
            changeAveragePoolSize: function(e) {
                const raw = e.target.value;
                const value = raw === 'all' ? 'all' : parseInt(raw);
                this.$store.changeConfigSetting({ config_key: 'average_pool_size', config_value: value });
            },
            changeNameColumn: function(value) {
                this.$store.changeConfigSetting({ config_key: 'name_column', config_value: value });
            },
            changePosColumn: function(value) {
                this.$store.changeConfigSetting({ config_key: 'pos_column', config_value: value });
            },
            changeGamesColumn: function(value) {
                this.$store.changeConfigSetting({ config_key: 'games_column', config_value: value });
            },
            changeMinutesColumn: function(value) {
                this.$store.changeConfigSetting({ config_key: 'minutes_column', config_value: value });
            },
            onMultiChange: function(e, key) {
                const values = Array.from(e.target.selectedOptions).map(o => parseInt(o.value));
                this.$store.changeConfigSetting({ config_key: key, config_value: values });
            },
            changeNegativeColumns: function(value) {
                this.$store.changeConfigSetting({ config_key: 'negative_columns', config_value: value });
            },
            changeYearlyTotalColumns: function(value) {
                this.$store.changeConfigSetting({ config_key: 'yearly_total_columns', config_value: value });
            },
            changeKeyColumns: function(value) {
                this.$store.changeConfigSetting({ config_key: 'key_columns', config_value: value });
            },
            columnLabel: function(index) {
                return `${this.$store.columns[index]} (Column ${index})`;
            }
        },
        computed: {
            positions: function () {
                let positions = this.$store.config.positions;
                return positions.join(',');
            },
            available_columns_simple: function () {
                return this.$store.columns.map((column,index) => {
                    return index;
                });
            },
            // Two-way bindings for multi-selects
            keyColumnsModel: {
                get() {
                    return this.$store.config.key_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.changeConfigSetting({ config_key: 'key_columns', config_value: nums });
                }
            },
            negativeColumnsModel: {
                get() {
                    return this.$store.config.negative_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.changeConfigSetting({ config_key: 'negative_columns', config_value: nums });
                }
            },
            rankingOnlyColumnsModel: {
                get() {
                    return this.$store.config.ranking_only_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.changeConfigSetting({ config_key: 'ranking_only_columns', config_value: nums });
                }
            },
            yearlyTotalColumnsModel: {
                get() {
                    return this.$store.config.yearly_total_columns;
                },
                set(values) {
                    const nums = values.map(v => parseInt(v));
                    this.$store.changeConfigSetting({ config_key: 'yearly_total_columns', config_value: nums });
                }
            },
            ...mapState(usePickerStore, {
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
