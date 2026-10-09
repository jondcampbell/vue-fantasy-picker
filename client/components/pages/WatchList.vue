<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">Watch List</h2>
            <p class="page-subtitle">Players you're keeping an eye on.</p>
        </header>

        <div class="card p-4" v-if="filteredPlayers.length > 0">
            <player-summary :players="filteredPlayers"></player-summary>
        </div>

        <player-table :players="filteredPlayers">
            <template #empty>Nobody on your watch list yet. Use the <icon name="binoculars" class="mx-0.5 inline"></icon> button on any player to add them.</template>
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
                return this.$store.watchList;
            }
        },
        components: {
            PlayerTable,
            PlayerSummary
        }
    }
</script>
