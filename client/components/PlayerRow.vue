<template>
    <tr class="player-row">
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
            }
        },
        computed: {

        }
    }
</script>

<style lang="scss">
    .player-row {
    }
</style>
