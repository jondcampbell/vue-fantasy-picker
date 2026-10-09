<template>
    <tr>
        <td class="pin left-0 w-12 min-w-12 text-right text-muted">{{ rank }}</td>
        <td class="pin left-12 w-28 min-w-28 py-0.5">
            <list-toggles :playerKey="playerKey"></list-toggles>
        </td>
        <td class="pin left-40 font-medium">
            {{ playerName }}
            <span v-if="injury" class="ml-1 rounded px-1 text-[10px] font-semibold" :class="injury.class" :title="espn.injury">{{ injury.label }}</span>
        </td>
        <td class="text-right">{{ playerGames }}</td>
        <td class="whitespace-nowrap text-muted">{{ playerPosition }}</td>
        <td v-for="(score_column, index) in scoreData" :key="index" :class="scoreClass(index)" :title="scoreData[index]">{{ formatScore(index) }}</td>
        <td v-if="proj !== undefined" class="text-right" :class="proj === null ? 'text-muted' : proj >= 1 ? 'text-good' : 'text-bad'" :title="proj ?? 'No ESPN projection'">{{ proj === null ? '—' : proj.toFixed(2) }}</td>
        <td v-if="showEspnRank" class="text-right text-muted">{{ espn?.espnRank ?? '—' }}</td>
    </tr>
</template>

<script>
    import ListToggles from 'components/partials/ListToggles.vue';

    export default {
        props: [
            'rank',
            'scoreData',
            'playerKey',
            'playerName',
            'playerPosition',
            'playerGames',
            'bestScores',
            'worstScores',
            // Overall score from ESPN's projection: undefined hides the column, null shows "—"
            'proj',
            // ESPN details for this player (injury, rank), or null
            'espn',
            'showEspnRank'
        ],
        computed: {
            injury() {
                const status = this.espn?.injury;
                if (!status || status === 'ACTIVE') {
                    return null;
                }
                const labels = { OUT: 'OUT', DAY_TO_DAY: 'DTD', SUSPENSION: 'SUSP', INJURY_RESERVE: 'IR' };
                return { label: labels[status] || status.slice(0, 4), class: status === 'DAY_TO_DAY' ? 'bg-warn/15 text-warn' : 'bg-bad/15 text-bad' };
            }
        },
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
