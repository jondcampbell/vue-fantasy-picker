<template>
    <div class="scores-wrapper">
        <section class="row ">
            <div class="col-12">
                <h3>Ranking players by {{ $store.getters.activeCategoryName }}</h3>
                <div class="mb-3">
                    <player-summary :players="filteredPlayers" type="score"></player-summary>
                    <player-filtering ></player-filtering>
                    <player-list-scoring  :players="filteredPlayers" v-if="! $store.state.search_text && this.position == 'all'"></player-list-scoring>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover scores-table">
                        <thead class="thead-inverse">
                            <tr>
                                <th>Watch</th>
                                <th>Mine</th>
                                <th>Taken</th>
                                <th>Name</th>
                                <th>Games Played</th>
                                <th>Position</th>
                                <th v-for="(column, index) in $store.getters.keyColumns">{{column}}</th>
                                <th>Average Score</th>
                                <th>Above Average Scores</th>
                            </tr>
                        </thead>
                        <tbody>
                            <score-row
                            class=""
                            ref="score_items"
                            :bestScores="bestScores"
                            :worstScores="worstScores"
                            v-for="(scoreItem, index) in filteredPlayers"
                            v-bind:key="index"
                            v-bind:scoreData="scoreItem.scoreData"
                            v-bind:playerId="scoreItem.playerId"
                            v-bind:playerName="scoreItem.playerName"
                            v-bind:playerPosition="scoreItem.playerPosition"
                            v-bind:playerGames="scoreItem.playerGames"
                            ></score-row>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

    </div>
</template>

<script>
    import ScoreRow from 'components/partials/ScoreRow';
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    import PlayerSummary from 'components/partials/PlayerSummary';
    import PlayerFiltering from 'components/partials/PlayerFiltering';
    import PlayerListScoring from 'components/partials/PlayerListScoring';


    export default {
        methods: {},
        computed: {
            position() {
                return this.$store.state.active_position;
            },
            filteredPlayers() {
                // Make a copy of the array
                return this.$store.getters.sortedFilteredPlayerScores;

            },
            bestScores(){
                let bestScores = {};
                let key_columns = this.$store.state.config.key_columns;

                this.filteredPlayers.forEach((player) => {
                    key_columns.forEach((column) => {

                        if(typeof(bestScores[column]) === 'undefined'){
                            bestScores[column] = player.scoreData[column];
                        }
                        if(player.scoreData[column] > bestScores[column] ){
                            bestScores[column] = player.scoreData[column];
                        }
                    });
                });
                return bestScores;
            },
            worstScores(){
                let worstScores = {};
                let key_columns = this.$store.state.config.key_columns;

                this.filteredPlayers.forEach((player) => {
                    key_columns.forEach((column) => {

                        if(typeof(worstScores[column]) === 'undefined'){
                            worstScores[column] = player.scoreData[column];
                        }
                        if(player.scoreData[column] < worstScores[column] ){
                            worstScores[column] = player.scoreData[column];
                        }
                    });
                });
                return worstScores;
            }
        },
        components: {
            ScoreRow,
            PlayerSummary,
            PlayerFiltering,
            PlayerListScoring
        }
    }
</script>

<style lang="scss">
    .scores-wrapper {
        .scores-table{
            th{
                &.name{

                 }
            }
            td{

            }
        }
    }
</style>
