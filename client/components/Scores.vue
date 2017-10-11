<template>
    <div class="scores-wrapper">
        <section class="row ">
            <div class="col-12">
                <strong>Scored players count {{ totalScoredPlayers }}</strong><br />
                <div class="table-responsive">
                    <table class="table table-hover scores-table">
                        <thead class="thead-inverse">
                            <tr>
                                <!-- TODO: Fix this so we are looking at just key columns -->
                                <th>Name</th>
                                <th>Games Played</th>
                                <th>Position</th>
                                <th v-for="(column, index) in keyColumns">{{column}}</th>
                                <th>Average Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            <score-row
                            class=""
                            v-bind:key="score[0]"
                            ref="score_items"
                            v-for="(score, index) in $store.state.scores"
                            :score="score"
                            :playerId="index"></score-row>
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
        methods: {},
        computed: {
            keyColumns(){
                let temp_store = this.$store;
                return this.$store.state.columns.filter(function(column, index) {
                    // Check if this player has played enough games
                    return temp_store.state.config.key_columns.includes(index);
                });
            },
            totalScoredPlayers() {
                return Object.keys(this.$store.state.scores).length;
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
