<template>
    <tr class="score-row">
        <td >
            {{ playerName }}
        </td>
        <td >
            {{ playerGames }}
        </td>
        <td >
            {{ playerPosition }}
        </td>
        <td v-for="(score_column, index) in scoreData" v-bind:class="scoreClass(index)">{{ scoreData[index] }}</td>
    </tr>
</template>

<script>
    export default {
        props: [
            'scoreData',
            'playerId',
            'playerName',
            'playerPosition',
            'playerGames'
        ],
        methods: {
            scoreClass(column_index) {
                return { }
            }
        },
        computed: {
            playerIndex(){
                let playerId = this.playerId;
                return this.$store.state.players.findIndex(function(player, index) {
                    return player[0] == playerId;
                });
            }
        }
    }
</script>

<style lang="scss">
    .score-row {
    }
</style>
