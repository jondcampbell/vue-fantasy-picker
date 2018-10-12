<template>
    <div class="watch-list-wrapper">
        <h2>Watch List</h2>
        <section class="row ">
            <div class="col-12">
                <div class="mb-3">
                    <strong>Player count {{ totalWatchListPlayers }}</strong><br />
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
    import PlayerRow from 'components/PlayerRow';
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';

    export default {
        methods: {},
        computed: {
            filteredPlayers() {
                return this.$store.getters.watchList;
            },
            totalWatchListPlayers() {
                return this.$store.getters.watchList.length;
            }
        },
        components: {
            PlayerRow
        }
    }
</script>

<style lang="scss">
    .watch-list-wrapper {
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
