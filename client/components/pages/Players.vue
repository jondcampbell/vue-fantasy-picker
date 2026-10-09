<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">Players</h2>
            <p class="page-subtitle">Raw stats from your import. Scores update automatically on the Rankings screen.</p>
        </header>

        <div class="card space-y-4 p-4">
            <player-summary :players="filteredPlayers"></player-summary>
            <player-filtering></player-filtering>
        </div>

        <player-table :players="filteredPlayers">
            <template #empty v-if="$store.players.length == 0">No players yet. Import a stats CSV to get started.</template>
        </player-table>
    </div>
</template>

<script>
    import PlayerTable from 'components/partials/PlayerTable.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';
    import PlayerFiltering from 'components/partials/PlayerFiltering.vue';

    export default {
        computed: {
            filteredPlayers() {
                return this.$store.filteredPlayers;
            }
        },
        components: {
            PlayerTable,
            PlayerSummary,
            PlayerFiltering
        }
    }
</script>
