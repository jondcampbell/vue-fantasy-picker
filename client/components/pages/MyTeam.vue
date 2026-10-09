<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">My Team</h2>
            <p class="page-subtitle">Your lineup is filled automatically: best scores start, the rest go to the bench. Slots are set in Configure.</p>
        </header>

        <list-issues list="my_team"></list-issues>

        <roster-card v-if="$store.my_team.length > 0"></roster-card>

        <div class="card p-4" v-if="filteredPlayers.length > 0">
            <player-summary :players="filteredPlayers"></player-summary>
        </div>

        <player-table :players="filteredPlayers">
            <template #empty v-if="$store.scores.length == 0">Import players first, then use the <icon name="users" class="mx-0.5 inline"></icon> button to build your team.</template>
            <template #empty v-else>No players on your team yet. Use the <icon name="users" class="mx-0.5 inline"></icon> button on any player to add them.</template>
        </player-table>
    </div>
</template>

<script>
    import PlayerTable from 'components/partials/PlayerTable.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';
    import ListIssues from 'components/partials/ListIssues.vue';
    import RosterCard from 'components/partials/RosterCard.vue';

    export default {
        methods: {},
        computed: {
            filteredPlayers() {
                return this.$store.myPlayers;
            }
        },
        components: {
            PlayerTable,
            PlayerSummary,
            ListIssues,
            RosterCard
        }
    }
</script>
