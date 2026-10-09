<template>
    <div class="space-y-5">
        <header>
            <h2 class="page-title">Rankings</h2>
            <p class="page-subtitle">Ranked by <span class="font-medium text-fg">{{ $store.activeCategoryName }}</span>. Scores are relative to the category baseline: 1.00 is average.<template v-if="rankingOnlyCategories.length > 0"> Columns marked * are rankable but not counted in the overall score.</template></p>
        </header>

        <div class="card space-y-4 p-4">
            <player-summary :players="filteredPlayers" type="score"></player-summary>
            <player-filtering></player-filtering>
        </div>

        <player-list-scoring :players="filteredPlayers" v-if="! $store.search_text && position == 'all' && filteredPlayers.length > 0"></player-list-scoring>

        <div class="card overflow-hidden" v-if="filteredPlayers.length > 0">
            <div class="flex items-center gap-3 border-b border-line px-3 py-2">
                <span class="label mb-0 shrink-0">Rank by</span>
                <nav class="flex min-w-0 gap-1 overflow-x-auto">
                    <button type="button" class="pill cursor-pointer" v-for="category in categories" :key="category.key"
                        :class="{ 'pill-active': isActive(category.key) }"
                        @click="changeCategory(category.key)">{{ category.label }}</button>
                    <template v-if="rankingOnlyCategories.length > 0">
                        <span class="mx-1 my-1 w-px shrink-0 bg-line" aria-hidden="true"></span>
                        <button type="button" class="pill cursor-pointer" v-for="category in rankingOnlyCategories" :key="category.key"
                            :class="{ 'pill-active': isActive(category.key) }" :title="`${category.label} is not counted in the Overall score`"
                            @click="changeCategory(category.key)">{{ category.label }}</button>
                    </template>
                </nav>
            </div>
            <div class="table-wrap rounded-none border-0">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="pin left-0 w-12 min-w-12 text-right">#</th>
                            <th class="pin left-12 w-28 min-w-28">Lists</th>
                            <th class="pin left-40">Name</th>
                            <th class="text-right">GP</th>
                            <th>Pos</th>
                            <th v-for="category in sortableColumns" :key="category.key" class="text-right" :aria-sort="isActive(category.key) ? 'descending' : 'none'">
                                <button type="button" class="sort-header" :class="{ 'sort-header-active': isActive(category.key) }" :title="category.rankingOnly ? `Rank by ${category.label} (not counted in Overall)` : `Rank by ${category.label}`" @click="changeCategory(category.key)">
                                    <icon name="caret-down"></icon>{{ category.header }}<span v-if="category.rankingOnly" class="font-normal">*</span>
                                </button>
                            </th>
                            <th class="text-center" title="Categories above average">Above Avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        <score-row
                        v-for="(scoreItem, index) in limitRows(filteredPlayers)"
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
                <table-footer :shown="Math.min(rowLimit, filteredPlayers.length)" :total="filteredPlayers.length" @more="showMoreRows" @all="showAllRows"></table-footer>
            </div>
        </div>
        <div class="card px-6 py-12 text-center text-sm text-muted" v-else>No players match these filters.</div>
    </div>
</template>

<script>
    import ScoreRow from 'components/partials/ScoreRow.vue';
    import PlayerSummary from 'components/partials/PlayerSummary.vue';
    import PlayerFiltering from 'components/partials/PlayerFiltering.vue';
    import PlayerListScoring from 'components/partials/PlayerListScoring.vue';
    import { scoredColumns } from 'store/scoring';
    import TableFooter from 'components/partials/TableFooter.vue';
    import rowLimit from 'components/mixins/rowLimit.js';


    export default {
        mixins: [rowLimit],
        methods: {
            isActive(key) {
                return this.$store.active_category == key;
            },
            changeCategory(key) {
                this.$store.changeActiveCategory(key);
            }
        },
        computed: {
            // Scored columns in table order (column index order, matching scoreData), then the overall score
            sortableColumns() {
                const state = this.$store;
                const rankingOnly = state.config.ranking_only_columns || [];
                const columns = scoredColumns(state.config).map(index => ({
                    key: index,
                    label: state.columns[index],
                    header: state.columns[index],
                    rankingOnly: rankingOnly.includes(index) && !state.config.key_columns.includes(index)
                }));
                return [...columns, { key: 'total', label: 'Overall', header: 'Score', rankingOnly: false }];
            },
            categories() {
                const columns = this.sortableColumns.filter(column => !column.rankingOnly);
                return [columns[columns.length - 1], ...columns.slice(0, -1)];
            },
            rankingOnlyCategories() {
                return this.sortableColumns.filter(column => column.rankingOnly);
            },
            position() {
                return this.$store.active_position;
            },
            filteredPlayers() {
                return this.$store.sortedFilteredPlayerScores;
            },
            bestScores(){
                return this.$store.bestScores;
            },
            worstScores(){
                return this.$store.worstScores;
            }
        },
        components: {
            ScoreRow,
            PlayerSummary,
            PlayerFiltering,
            PlayerListScoring,
            TableFooter
        }
    }
</script>
