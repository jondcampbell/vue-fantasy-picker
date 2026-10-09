<template>
    <section class="card overflow-hidden border-warn/40" v-if="issues.length > 0">
        <div class="border-b border-line bg-warn/10 px-4 py-3">
            <h3 class="font-semibold text-warn">Needs attention · {{ issues.length }}</h3>
            <p class="help">These list entries didn't match anyone in the current data.</p>
        </div>
        <ul class="divide-y divide-line">
            <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm" v-for="issue in issues" :key="issue.key">
                <div class="min-w-48 flex-1">
                    <div class="font-medium">{{ issue.name }}</div>
                    <div class="text-xs text-muted">
                        {{ issue.status === 'ambiguous' ? 'Several players have this name. Which one?' : 'Not in the current data (released, retired or renamed?)' }}
                        · {{ issue.lists.map(list => labels[list]).join(', ') }}
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="btn btn-ghost py-1" v-for="candidate in issue.candidates" :key="candidate.key"
                        :title="`Use ${candidate.name} (${candidate.team} ${candidate.position}, ${candidate.games} GP)`"
                        @click="$store.renameListKey(issue.key, candidate.key)">
                        {{ candidate.name }} <span class="text-muted">{{ candidate.team }} · {{ candidate.position }} · {{ candidate.games }} GP</span>
                    </button>
                    <button type="button" class="btn btn-ghost py-1 text-bad" @click="$store.dropListEntry(issue.key)">Remove</button>
                </div>
            </li>
        </ul>
    </section>
</template>

<script>
    import { LIST_LABELS } from 'store';

    export default {
        props: [
            // Optional: only show entries from this list
            'list'
        ],
        data() {
            return { labels: LIST_LABELS };
        },
        computed: {
            issues() {
                const issues = this.$store.listIssues;
                return this.list ? issues.filter(issue => issue.lists.includes(this.list)) : issues;
            }
        }
    }
</script>
