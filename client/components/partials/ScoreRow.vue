<template>
    <tr>
        <td class="pin left-0 w-12 min-w-12 text-right text-muted">{{ rank }}</td>
        <td class="pin left-12 w-28 min-w-28 py-0.5">
            <list-toggles :playerId="playerId"></list-toggles>
        </td>
        <td class="pin left-40 font-medium">{{ playerName }}</td>
        <td class="text-right">{{ playerGames }}</td>
        <td class="text-muted">{{ playerPosition }}</td>
        <td v-for="(score_column, index) in scoreData" :key="index" :class="scoreClass(index)" :title="scoreData[index]">{{ formatScore(index) }}</td>
    </tr>
</template>

<script>
    import ListToggles from 'components/partials/ListToggles.vue';

    export default {
        props: [
            'rank',
            'scoreData',
            'playerId',
            'playerName',
            'playerPosition',
            'playerGames',
            'bestScores',
            'worstScores'
        ],
        methods: {
            scoreClass(column_index) {
                if (column_index == 'aboveAverage') {
                    return 'text-center';
                }
                if (column_index == 'total') {
                    return 'text-right font-semibold';
                }
                if(this.scoreData[column_index] >= this.bestScores[column_index]){
                    return 'text-right bg-good/15 font-semibold text-good';
                }
                if(this.scoreData[column_index] <= this.worstScores[column_index]){
                    return 'text-right bg-bad/10 text-bad';
                }
                return 'text-right';
            },
            formatScore(column_index) {
                const value = this.scoreData[column_index];
                return column_index == 'aboveAverage' ? value : Number(value).toFixed(2);
            }
        },
        components: {
            ListToggles
        }
    }
</script>
