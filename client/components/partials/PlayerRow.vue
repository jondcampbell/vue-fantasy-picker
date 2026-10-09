<template>
    <tr>
        <td class="pin left-0 w-28 min-w-28 py-0.5">
            <list-toggles :playerId="playerId"></list-toggles>
        </td>
        <td v-for="(player_column, index) in player" :key="index" :class="playerClass(index)">{{ player[index] }}</td>
    </tr>
</template>

<script>
    import ListToggles from 'components/partials/ListToggles.vue';

    export default {
        props: [
            'index',
            'player'
        ],
        methods: {
            playerClass(column_index) {
                const config = this.$store.state.config;
                const value = this.player[column_index];
                return {
                    'pin left-28 font-medium': column_index == config.name_column,
                    'key-col font-medium': config.key_columns.includes(column_index),
                    'text-muted': column_index == config.pos_column,
                    'text-right': typeof value === 'number' || (value !== '' && !isNaN(value))
                }
            }
        },
        computed: {
            playerId() {
                return this.player[this.$store.state.config.id_column];
            }
        },
        components: {
            ListToggles
        }
    }
</script>
