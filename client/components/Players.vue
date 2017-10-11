<template>
    <div class="players-wrapper">
        <h2>Players <button @click="evaluatePlayers()" class="btn btn-primary float-right">Evaluate Players</button></h2>
        <section class="row ">
            <div class="col-12">
                <strong>Player count {{ totalPlayers }}</strong><br />
                <div class="table-responsive">
                    <table class="table table-hover players-table">
                        <thead class="thead-inverse">
                            <tr>
                                <th v-for="(column, index) in $store.state.columns">{{column}}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <player-row
                            class=""
                            v-bind:key="player[0]"
                            ref="player_items"
                            v-for="(player, index) in $store.state.players"
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
        methods: {
            evaluatePlayers() {
                this.$store.dispatch('evaluatePlayers');
                sweetAlert("Woot!", "We evaluated your players", "success");
            }
        },
        computed: {
            totalPlayers() {
                return this.$store.state.players.length;
            }
        },
        components: {
            PlayerRow
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
