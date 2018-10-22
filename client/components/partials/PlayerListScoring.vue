<template>
    <div>
        Overall: {{ teamOverallScore }} &nbsp; &nbsp; &nbsp;
        <span v-for="(column, index) in $store.getters.keyColumns">{{column}}: {{ teamScores[index].toFixed(3) }} &nbsp; &nbsp; &nbsp;</span>
    </div>
</template>

<script>
    export default {
        props: ['players'],
        methods: {
            average(items) {
                return items.reduce( ( p, c ) => p + c, 0 ) / items.length;
            }
        },
        computed: {
            teamScores() {
                let players = this.players;
                let key_columns = this.$store.state.config.key_columns;
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
                let scores = this.teamScores;
                console.log(scores);
                return this.average(scores).toFixed(3);
            }
        }
    }
</script>

<style lang="scss">

</style>
