<template>
    <div class="players-wrapper">
        <h2>Players <button @click="evaluatePlayers()" class="btn btn-primary float-right">Evaluate Players</button></h2>
        <section class="row ">
            <div class="col-12">
                <div class="mb-3">
                    <player-summary :players="filteredPlayers" ></player-summary>
                    <player-filtering ></player-filtering>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover players-table">
                        <thead class="thead-inverse">
                            <tr>
                                <th>Watch</th>
                                <th>Mine</th>
                                <th>Taken</th>
                                <th v-for="(column, index) in $store.state.columns">{{column}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <player-row
                            class=""
                            v-bind:key="player[$store.state.config.id_column]"
                            ref="player_items"
                            v-for="(player, index) in filteredPlayers"
                            :player="player"
                            :index="index"></player-row>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

    </div>
</template>

<script>
    import PlayerRow from 'components/partials/PlayerRow';
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    import PlayerSummary from 'components/partials/PlayerSummary';
    import PlayerFiltering from 'components/partials/PlayerFiltering';

    export default {
        methods: {
            evaluatePlayers() {
                this.$store.dispatch('evaluatePlayers');
                sweetAlert("Woot!", "We evaluated your players", "success");
            }
        },
        computed: {
            filteredPlayers() {
                return this.$store.getters.filteredPlayers;
            }
        },
        components: {
            PlayerRow,
            PlayerSummary,
            PlayerFiltering
        }
    }
</script>

<style lang="scss">
    .players-wrapper {
        .players-table{
            th{
                &.name{

                 }
            }
            td{

            }
        }
    }
</style>
