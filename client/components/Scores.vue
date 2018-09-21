<template>
    <div class="scores-wrapper">
        <section class="row ">
            <div class="col-12">
                <h3>Ranking players by {{ $store.getters.activeCategoryName }}</h3>
                <strong>Scored players count {{ totalScoredPlayers }}</strong><br />
                Position:
                <select v-bind:value="$store.state.active_position" v-on:change="changePosition">
                    <option value="all">All</option>
                    <option v-for="position in $store.state.config.positions" v-bind:value="position">{{position}}</option>
                </select>
                <div class="table-responsive">
                    <table class="table table-hover scores-table">
                        <thead class="thead-inverse">
                            <tr>
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
                            v-for="(scoreItem, index) in $store.getters.sortedPlayerScores($store.state.active_category)"
                            v-bind:key="index"
                            v-bind:scoreData="scoreItem.scoreData"
                            v-bind:playerId="scoreItem.playerId"
                            ></score-row>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

    </div>
</template>

<script>
    import ScoreRow from 'components/ScoreRow';
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';

    export default {
        methods: {
            changePosition(event){
                let position = event.target.value;
        	    this.$store.dispatch('changeActivePosition', position);
            }
        },
        computed: {
            totalScoredPlayers() {
                return this.$store.state.scores.length;
            },
            position() {
                return this.$store.state.active_position;
            }
        },
        components: {
            ScoreRow,
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
