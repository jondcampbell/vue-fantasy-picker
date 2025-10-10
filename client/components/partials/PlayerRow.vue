<template>
    <tr class="player-row">
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
        <td v-for="(player_column, index) in player" v-bind:class="playerClass(index)">{{ player[index] }}</td>
    </tr>
</template>

<script>
    export default {
        props: [
            'index',
            'player'
        ],
        methods: {
            playerClass(column_index) {
                return {
                    'table-primary': this.$store.state.config.key_columns.includes(column_index),
                    'table-active': column_index == this.$store.state.config.name_column,
                    'table-info': column_index == this.$store.state.config.pos_column
                }
            },
            addPlayerToWatchList(){
                const id_column = this.$store.state.config.id_column;
                this.$store.dispatch('addToList',{ list: 'watch_list', player_id: this.player[id_column] });
            },
            removePlayerFromWatchList(){
                const id_column = this.$store.state.config.id_column;
                this.$store.dispatch('removeFromList',{ list: 'watch_list', player_id: this.player[id_column] });
            },
            addPlayerToMyTeam(){
                const id_column = this.$store.state.config.id_column;
                this.$store.dispatch('addToList',{ list: 'my_team', player_id: this.player[id_column] });
            },
            removePlayerFromMyTeam(){
                const id_column = this.$store.state.config.id_column;
                this.$store.dispatch('removeFromList',{ list: 'my_team', player_id: this.player[id_column] });
            },
            addPlayerToTaken(){
                const id_column = this.$store.state.config.id_column;
                this.$store.dispatch('addToList',{ list: 'taken_players', player_id: this.player[id_column] });
            },
            removePlayerFromTaken(){
                const id_column = this.$store.state.config.id_column;
                this.$store.dispatch('removeFromList',{ list: 'taken_players', player_id: this.player[id_column] });
            }
        },
        computed: {
            watched(){
                const id_column = this.$store.state.config.id_column;
                const player_id = this.player[id_column];
                return this.$store.getters.isWatched(player_id);
            },
            onTeam(){
                const id_column = this.$store.state.config.id_column;
                const player_id = this.player[id_column];
                return this.$store.getters.isOnTeam(player_id);
            },
            taken(){
                const id_column = this.$store.state.config.id_column;
                const player_id = this.player[id_column];
                return this.$store.getters.isTaken(player_id);
            }
        }
    }
</script>

<style lang="scss">
    .player-row {
    }
</style>
