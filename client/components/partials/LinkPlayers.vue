<template>
    <section class="card overflow-hidden" v-if="entries.length > 0 || waiting > 0">
        <div class="border-b border-line px-4 py-3">
            <h3 class="font-semibold">Link players<template v-if="entries.length > 0"> · {{ entries.length }}</template></h3>
            <p class="help" v-if="entries.length > 0">These ESPN players didn't match a Basketball-Reference player by name. Pick the same player so both sources' stats line up, or dismiss if there's no match.</p>
            <p class="help" v-if="waiting > 0">{{ waiting }} more (mostly rookies) aren't on Basketball-Reference yet and will link automatically on a later update.</p>
        </div>
        <ul class="divide-y divide-line" v-if="entries.length > 0">
            <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm" v-for="entry in entries" :key="entry.espnId">
                <div class="min-w-48 flex-1">
                    <div class="font-medium">{{ entry.name }}</div>
                    <div class="text-xs text-muted">ESPN · {{ entry.team }}<template v-if="entry.reason === 'ambiguous'"> · several players share this name</template></div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="btn btn-ghost py-1" v-for="candidate in entry.candidates" :key="candidate.bbrefId"
                        :title="`Link to ${candidate.name} (${candidate.bbrefId})`"
                        @click="$store.linkPlayer(entry.espnId, candidate.bbrefId)">
                        {{ candidate.name }} <span class="text-muted">{{ candidate.team }} · {{ candidate.gp }} GP</span>
                    </button>
                    <button type="button" class="btn btn-ghost py-1 text-muted" @click="$store.dismissLink(entry.espnId)">Dismiss</button>
                </div>
            </li>
        </ul>
    </section>
</template>

<script>
    export default {
        computed: {
            entries() {
                return this.$store.unlinked.filter(entry => !entry.dismissed && entry.candidates.length > 0);
            },
            waiting() {
                return this.$store.unlinked.filter(entry => !entry.dismissed && entry.candidates.length === 0).length;
            }
        }
    }
</script>
