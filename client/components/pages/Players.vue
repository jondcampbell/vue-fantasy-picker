<template>
    <div class="space-y-5">
        <header class="space-y-3">
            <h2 class="page-title">Players</h2>
            <p class="page-subtitle">Raw stats from the active dataset. Scores update automatically on the Rankings screen.</p>
            <dataset-switcher></dataset-switcher>
        </header>

        <div class="card space-y-4 p-4">
            <player-summary :players="filteredPlayers"></player-summary>
            <player-filtering></player-filtering>
        </div>

        <player-table :players="filteredPlayers">
            <template #empty v-if="$store.players.length == 0">No players yet. Use Update stats on the Data screen, or import a CSV.</template>
        </player-table>
    </div>
</template>

<script>
    import PlayerTable from 'components/partials/PlayerTable.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';
    import PlayerFiltering from 'components/partials/PlayerFiltering.vue';
    import DatasetSwitcher from 'components/partials/DatasetSwitcher.vue';

    export default {
        computed: {
            filteredPlayers() {
                return this.$store.filteredPlayers;
            }
        },
        components: {
            PlayerTable,
            PlayerSummary,
            PlayerFiltering,
            DatasetSwitcher
        }
    }
</script>
