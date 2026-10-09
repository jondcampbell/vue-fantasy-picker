<template>
    <div class="space-y-5">
        <header class="flex flex-wrap items-end justify-between gap-4">
            <div>
                <h2 class="page-title">Players</h2>
                <p class="page-subtitle">Raw stats from your import. Evaluate to score players against the category baselines.</p>
            </div>
            <button type="button" @click="evaluatePlayers()" class="btn btn-primary" :disabled="$store.state.players.length == 0">
                <icon name="chart"></icon> Evaluate Players
            </button>
        </header>

        <div class="card space-y-4 p-4">
            <player-summary :players="filteredPlayers"></player-summary>
            <player-filtering></player-filtering>
        </div>

        <player-table :players="filteredPlayers">
            <template #empty v-if="$store.state.players.length == 0">No players yet. Import a stats CSV to get started.</template>
        </player-table>
    </div>
</template>

<script>
    import Swal from 'sweetalert2';
    import PlayerTable from 'components/partials/PlayerTable.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';
    import PlayerFiltering from 'components/partials/PlayerFiltering.vue';

    export default {
        methods: {
            evaluatePlayers() {
                this.$store.dispatch('evaluatePlayers');
                Swal.fire("Woot!", "We evaluated your players", "success");
            }
        },
        computed: {
            filteredPlayers() {
                return this.$store.getters.filteredPlayers;
            }
        },
        components: {
            PlayerTable,
            PlayerSummary,
            PlayerFiltering
        }
    }
</script>
