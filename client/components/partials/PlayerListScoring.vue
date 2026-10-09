<template>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
        <div class="card px-3 py-2">
            <div class="label mb-0.5">Overall</div>
            <div class="text-lg font-semibold tabular-nums" :class="scoreClass(teamOverallScore)">{{ teamOverallScore.toFixed(3) }}</div>
        </div>
        <div class="card px-3 py-2" v-for="(column, index) in $store.keyColumns" :key="column">
            <div class="label mb-0.5">{{column}}</div>
            <div class="text-lg font-semibold tabular-nums" :class="scoreClass(teamScores[index])">{{ teamScores[index].toFixed(3) }}</div>
        </div>
    </div>
</template>

<script>
    import { overallColumns } from 'store/scoring';

    export default {
        props: ['players'],
        methods: {
            average(items) {
                return items.reduce( ( p, c ) => p + c, 0 ) / items.length;
            },
            scoreClass(score) {
                return score >= 1 ? 'text-good' : 'text-bad';
            }
        },
        computed: {
            teamScores() {
                let players = this.players;
                // Same columns, in the same (column) order, as $store.keyColumns
                let key_columns = overallColumns(this.$store.config).slice().sort((a, b) => a - b);
                let scores = [];
                key_columns.forEach((column) => {
                    let columnTotal = 0;
                    players.forEach((player) => {
                        columnTotal += player.scoreData[column];
                    });
                    let columnAverage = columnTotal / players.length;
                    scores.push(columnAverage);
                });

                return scores;
            },
            teamOverallScore(){
                return this.average(this.teamScores);
            }
        }
    }
</script>
