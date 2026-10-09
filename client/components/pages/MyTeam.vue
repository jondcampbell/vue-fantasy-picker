<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">My Team</h2>
            <p class="page-subtitle">Your rostered players.</p>
        </header>

        <div class="card p-4" v-if="filteredPlayers.length > 0">
            <player-summary :players="filteredPlayers"></player-summary>
        </div>

        <player-table :players="filteredPlayers">
            <template #empty v-if="$store.state.scores.length == 0">Evaluate players first, then use the <icon name="users" class="mx-0.5 inline"></icon> button to build your team.</template>
            <template #empty v-else>No players on your team yet. Use the <icon name="users" class="mx-0.5 inline"></icon> button on any player to add them.</template>
        </player-table>
    </div>
</template>

<script>
    import PlayerTable from 'components/partials/PlayerTable.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';

    export default {
        methods: {},
        computed: {
            filteredPlayers() {
                return this.$store.getters.myPlayers;
            }
        },
        components: {
            PlayerTable,
            PlayerSummary
        }
    }
</script>
