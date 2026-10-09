<template>
    <div class="table-wrap" v-if="players.length > 0">
        <table class="data-table">
            <thead>
                <tr>
                    <th class="pin left-0 w-28 min-w-28">Lists</th>
                    <th v-for="(column, index) in $store.columns" :key="index" :class="headerClass(index)">{{column}}</th>
                </tr>
            </thead>
            <tbody>
                <player-row
                v-for="(player, index) in players"
                :key="player[$store.config.id_column]"
                :player="player"
                :columnClasses="columnClasses"
                :index="index"></player-row>
            </tbody>
        </table>
    </div>
    <div class="card px-6 py-12 text-center text-sm text-muted" v-else>
        <slot name="empty">No players match these filters.</slot>
    </div>
</template>

<script>
    import PlayerRow from 'components/partials/PlayerRow.vue';

    export default {
        props: [
            'players'
        ],
        computed: {
            // Cell classes per column, computed once for the whole table instead of per cell
            columnClasses() {
                const config = this.$store.config;
                return this.$store.columns.map((column, column_index) => ({
                    'pin left-28 font-medium': column_index == config.name_column,
                    'key-col font-medium': config.key_columns.includes(column_index),
                    'text-muted': column_index == config.pos_column
                }));
            }
        },
        methods: {
            headerClass(column_index) {
                const config = this.$store.config;
                return {
                    'pin left-28': column_index == config.name_column,
                    'text-accent': config.key_columns.includes(column_index)
                }
            }
        },
        components: {
            PlayerRow
        }
    }
</script>
