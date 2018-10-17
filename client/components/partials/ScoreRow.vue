<template>
    <tr class="score-row">
        <td>
            <a @click="removePlayerFromWatchList" class="text-success" v-if="watched"><icon name="binoculars"></icon></a>
            <a @click="addPlayerToWatchList" class="text-secondary" v-else><icon name="binoculars"></icon></a>
        </td>
        <td>
            <a @click="removePlayerFromMyTeam" class="text-success" v-if="onTeam"><icon name="users"></icon></a>
            <a @click="addPlayerToMyTeam" class="text-secondary" v-else><icon name="users"></icon></a>
        </td>
        <td>
            <a @click="removePlayerFromTaken" class="text-danger" v-if="taken"><icon name="exclamation"></icon></a>
            <a @click="addPlayerToTaken" class="text-secondary" v-else><icon name="exclamation"></icon></a>
        </td>
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
            },
            addPlayerToWatchList(){
                this.$store.dispatch('addToList',{ list: 'watch_list', player_id: this.playerId });
            },
            removePlayerFromWatchList(){
                this.$store.dispatch('removeFromList',{ list: 'watch_list', player_id: this.playerId });
            },
            addPlayerToMyTeam(){
                this.$store.dispatch('addToList',{ list: 'my_team', player_id: this.playerId });
            },
            removePlayerFromMyTeam(){
                this.$store.dispatch('removeFromList',{ list: 'my_team', player_id: this.playerId });
            },
            addPlayerToTaken(){
                this.$store.dispatch('addToList',{ list: 'taken_players', player_id: this.playerId });
            },
            removePlayerFromTaken(){
                this.$store.dispatch('removeFromList',{ list: 'taken_players', player_id: this.playerId });
            }
        },
        computed: {
            playerIndex(){
                let playerId = this.playerId;
                return this.$store.state.players.findIndex(function(player, index) {
                    return player[this.$store.state.config.id_column] == playerId;
                });
            },
            watched(){
                if(this.$store.state.watch_list.includes(parseInt(this.playerId))){
                    return true;
                }
                return false;
            },
            onTeam(){
                if(this.$store.state.my_team.includes(parseInt(this.playerId))){
                    return true;
                }
                return false;
            },
            taken(){
                if(this.$store.state.taken_players.includes(parseInt(this.playerId))){
                    return true;
                }
                return false;
            }
        }
    }
</script>

<style lang="scss">
    .score-row {
    }
</style>
