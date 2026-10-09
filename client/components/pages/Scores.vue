<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">Rankings</h2>
            <p class="page-subtitle">Ranked by <span class="font-medium text-fg">{{ $store.getters.activeCategoryName }}</span>. Scores are relative to the category baseline: 1.00 is average.</p>
        </header>

        <div class="card space-y-4 p-4">
            <player-summary :players="filteredPlayers" type="score"></player-summary>
            <player-filtering></player-filtering>
        </div>

        <player-list-scoring :players="filteredPlayers" v-if="! $store.state.search_text && position == 'all' && filteredPlayers.length > 0"></player-list-scoring>

        <div class="table-wrap" v-if="filteredPlayers.length > 0">
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="pin left-0 w-12 min-w-12 text-right">#</th>
                        <th class="pin left-12 w-28 min-w-28">Lists</th>
                        <th class="pin left-40">Name</th>
                        <th class="text-right">GP</th>
                        <th>Pos</th>
                        <th v-for="column in $store.getters.keyColumns" :key="column" class="text-right" :class="{ 'text-accent': column == $store.getters.activeCategoryName }">{{column}}</th>
                        <th class="text-right" :class="{ 'text-accent': $store.state.active_category == 'total' }">Score</th>
                        <th class="text-center" title="Categories above average">Above Avg</th>
                    </tr>
                </thead>
                <tbody>
                    <score-row
                    v-for="(scoreItem, index) in filteredPlayers"
                    :key="scoreItem.playerId"
                    :rank="index + 1"
                    :bestScores="bestScores"
                    :worstScores="worstScores"
                    :scoreData="scoreItem.scoreData"
                    :playerId="scoreItem.playerId"
                    :playerName="scoreItem.playerName"
                    :playerPosition="scoreItem.playerPosition"
                    :playerGames="scoreItem.playerGames"
                    ></score-row>
                </tbody>
            </table>
        </div>
        <div class="card px-6 py-12 text-center text-sm text-muted" v-else>No players match these filters.</div>
    </div>
</template>

<script>
    import ScoreRow from 'components/partials/ScoreRow.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';
    import PlayerFiltering from 'components/partials/PlayerFiltering.vue';
    import PlayerListScoring from 'components/partials/PlayerListScoring.vue';


    export default {
        methods: {},
        computed: {
            position() {
                return this.$store.state.active_position;
            },
            filteredPlayers() {
                return this.$store.getters.sortedFilteredPlayerScores;
            },
            bestScores(){
                return this.$store.getters.bestScores;
            },
            worstScores(){
                return this.$store.getters.worstScores;
            }
        },
        components: {
            ScoreRow,
            PlayerSummary,
            PlayerFiltering,
            PlayerListScoring
        }
    }
</script>
