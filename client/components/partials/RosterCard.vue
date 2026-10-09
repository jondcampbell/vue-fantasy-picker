<template>
    <section class="card overflow-hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h3 class="font-semibold">Roster</h3>
            <div class="flex flex-wrap items-center gap-1.5 text-xs" v-if="openSlots.length > 0">
                <span class="text-muted">Open:</span>
                <span class="chip text-warn" v-for="open in openSlots" :key="open.slot">{{ open.slot }}<template v-if="open.count > 1"> ×{{ open.count }}</template></span>
            </div>
            <span class="chip text-good" v-else>All slots filled</span>
        </div>

        <div class="overflow-x-auto">
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="w-16">Slot</th>
                        <th>Player</th>
                        <th>Pos</th>
                        <th title="CSV position is fixed; click others to mark extra positions your league allows">Eligible</th>
                        <th class="text-center">IR</th>
                        <th class="text-right">Score</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in rows" :key="index" :class="{ 'roster-divider': row.divider }">
                        <td class="font-medium" :class="slotClass(row)" :title="row.overflow ? 'Over the roster limit: no open slot fits this player' : null">{{ row.slot }}</td>
                        <template v-if="row.player">
                            <td class="font-medium">{{ row.player.name }}</td>
                            <td class="text-muted">{{ row.player.position }}</td>
                            <td class="py-0.5">
                                <div class="flex gap-1">
                                    <button type="button" v-for="position in positions" :key="position"
                                        class="cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-medium transition disabled:cursor-default"
                                        :class="positionClass(row.player, position)"
                                        :disabled="position == row.player.position"
                                        :aria-pressed="row.player.positions.includes(position)"
                                        :title="position == row.player.position ? 'Position from the CSV' : `Eligible at ${position} in my league`"
                                        @click="$store.togglePositionOverride({ key: row.player.key, position: position })">{{ position }}</button>
                                </div>
                            </td>
                            <td class="py-0.5 text-center">
                                <button type="button"
                                    class="cursor-pointer rounded-md px-1.5 py-0.5 text-xs font-semibold transition"
                                    :class="row.player.ir ? 'bg-bad/15 text-bad' : 'text-muted/60 hover:bg-surface-2 hover:text-fg'"
                                    :aria-pressed="row.player.ir"
                                    :title="row.player.ir ? 'Move off IR' : 'Move to IR'"
                                    @click="$store.toggleIr(row.player.key)">IR</button>
                            </td>
                            <td class="text-right font-semibold" :class="scoreClass(row.player.score)">{{ formatScore(row.player.score) }}</td>
                        </template>
                        <td v-else colspan="5" class="text-warn/80 italic">Open</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>
</template>

<script>
    import { POSITIONS, isStarterSlot } from 'store/roster';

    export default {
        data() {
            return { positions: POSITIONS };
        },
        methods: {
            slotClass(row) {
                if (row.overflow) {
                    return 'text-bad';
                }
                return isStarterSlot(row.slot) ? 'text-accent' : 'text-muted';
            },
            positionClass(player, position) {
                if (position == player.position) {
                    return 'bg-accent text-accent-fg';
                }
                return player.positions.includes(position)
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                    : 'text-muted/60 hover:bg-surface-2 hover:text-fg';
            },
            scoreClass(score) {
                if (score === undefined) {
                    return 'text-muted';
                }
                return score >= 1 ? 'text-good' : 'text-bad';
            },
            formatScore(score) {
                return score === undefined ? '—' : score.toFixed(2);
            }
        },
        computed: {
            openSlots() {
                return this.$store.openRosterSlots;
            },
            // Lineup rows, a divider where the bench starts, then anyone over the roster limit
            rows() {
                const { assignments, overflow } = this.$store.roster;
                const rows = assignments.map((assignment, index) => ({
                    ...assignment,
                    divider: index > 0 && isStarterSlot(assignments[index - 1].slot) && !isStarterSlot(assignment.slot)
                }));
                overflow.forEach((player, index) => {
                    rows.push({ slot: 'Over', player: player, overflow: true, divider: index == 0 });
                });
                return rows;
            }
        }
    }
</script>
