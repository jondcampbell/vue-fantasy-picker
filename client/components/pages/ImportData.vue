<template>
    <div class="max-w-3xl space-y-5">
        <header>
            <h2 class="page-title">Data</h2>
            <p class="page-subtitle">Download stats from ESPN and Basketball-Reference, or import a CSV. Everything is stored locally, and your team, taken and watch lists carry over.</p>
        </header>

        <section class="card space-y-4 p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 class="font-semibold">Online stats</h3>
                    <p class="help">ESPN: this season's stats, ESPN's projections, last 30 days, positions and injuries. Basketball-Reference (via nbaapi.com): season stats and player IDs.</p>
                </div>
                <button type="button" class="btn btn-primary" :disabled="updating" @click="updateStats">
                    <icon name="cloud"></icon> {{ updating ? 'Updating…' : 'Update stats' }}
                </button>
            </div>
            <p class="text-sm text-muted" v-if="updating">{{ progress }}</p>
            <p class="text-sm text-bad" v-else-if="error">Update failed: {{ error }}</p>
            <p class="text-sm text-muted" v-else-if="$store.stats_updated_at">Last updated {{ formatDate($store.stats_updated_at) }}</p>
            <ul class="space-y-1 text-sm text-warn" v-if="warnings.length > 0 && !updating">
                <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
            </ul>
        </section>

        <section class="card overflow-hidden" v-if="$store.datasetList.length > 0">
            <div class="border-b border-line px-4 py-3">
                <h3 class="font-semibold">Datasets</h3>
                <p class="help">The active dataset drives the Players and Rankings screens; switch any time there too.</p>
            </div>
            <ul class="divide-y divide-line">
                <li class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm" v-for="dataset in $store.datasetList" :key="dataset.id">
                    <div class="min-w-48 flex-1">
                        <div class="font-medium">{{ dataset.label }}</div>
                        <div class="text-xs text-muted">{{ dataset.source }} · {{ dataset.players }} players<template v-if="dataset.fetchedAt"> · {{ formatDate(dataset.fetchedAt) }}</template></div>
                    </div>
                    <span class="chip text-accent" v-if="dataset.id === $store.active_dataset">Active</span>
                    <button type="button" class="btn btn-ghost py-1" v-else @click="$store.useDataset(dataset.id)">Use</button>
                </li>
            </ul>
        </section>

        <link-players></link-players>
        <list-issues></list-issues>

        <section class="space-y-3">
            <h3 class="font-semibold">Import a CSV</h3>
            <label
                class="card flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-6 py-8 text-center transition hover:border-accent"
                :class="{ 'border-accent bg-accent/5': dragging }"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="dropFile">
                <span class="grid size-12 place-items-center rounded-full bg-accent/10 text-xl text-accent"><icon :name="fileName ? 'csv' : 'upload'"></icon></span>
                <span v-if="fileName" class="font-medium">{{ fileName }}</span>
                <span v-else>
                    <span class="font-medium text-accent">Choose a CSV file</span> or drag it here
                </span>
                <span class="help">Basketball-Reference "Player Totals" export; the first row must be the column headers.</span>
                <input type="file" accept=".csv,text/csv" id="importFile" ref="fileInput" v-on:change="previewFiles" hidden/>
            </label>
            <div class="flex justify-end">
                <button type="button" @click="importPlayersFile" class="btn btn-primary" :disabled="! hasFiles">
                    <icon name="upload"></icon> Import CSV
                </button>
            </div>
        </section>
    </div>
</template>

<script>
    import papaparse from 'papaparse';
    import Swal from 'sweetalert2';
    import ListIssues from 'components/partials/ListIssues.vue';
    import LinkPlayers from 'components/partials/LinkPlayers.vue';

    const attentionMessage = function(issues) {
        const attention = issues.ambiguous + issues.missing;
        return attention > 0 ? `${attention} list ${attention === 1 ? 'entry needs' : 'entries need'} attention: see below.` : '';
    };

    export default {
        components: {
            ListIssues,
            LinkPlayers
        },
        data: function () {
            return {
                hasFiles: false,
                fileName: '',
                dragging: false,
                updating: false,
                progress: '',
                error: '',
                warnings: []
            }
        },
        methods: {
            formatDate(timestamp) {
                return new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            },
            async updateStats() {
                this.updating = true;
                this.error = '';
                this.warnings = [];
                try {
                    const result = await this.$store.updateStats({ onProgress: message => { this.progress = message; } });
                    this.warnings = result.warnings;
                    const notes = [
                        `${result.datasets} datasets downloaded.`,
                        result.unlinked > 0 ? `${result.unlinked} ${result.unlinked === 1 ? 'player needs' : 'players need'} linking: see below.` : '',
                        attentionMessage(result.issues)
                    ].filter(Boolean).join(' ');
                    Swal.fire('Stats updated', notes, result.unlinked > 0 || result.warnings.length > 0 ? 'info' : 'success');
                } catch (error) {
                    this.error = error.message;
                } finally {
                    this.updating = false;
                    this.progress = '';
                }
            },
            importPlayersFile: function (e) {
                var files = this.$refs.fileInput.files;
                if (files.length <= 0) {
                    return false;
                }

                var fr = new FileReader();
                let vuethis = this;
                const label = `CSV: ${this.fileName}`;

                fr.onload = function (e) {
                    papaparse.parse(e.target.result, {
                        complete: function(results) {
                            const issues = vuethis.$store.importPlayers(results.data, label);
                            vuethis.$refs.fileInput.value = '';
                            vuethis.hasFiles = false;
                            vuethis.fileName = '';
                            const message = attentionMessage(issues);
                            if (message) {
                                Swal.fire("Imported", message, "warning");
                            } else {
                                Swal.fire("Woot!", "We imported your players", "success");
                            }
                        }
                    });
                }

                fr.readAsText(files.item(0));
            },
            previewFiles(e) {
                const files = e.target.files;
                this.hasFiles = files.length > 0;
                this.fileName = this.hasFiles ? files.item(0).name : '';
            },
            dropFile(e) {
                this.dragging = false;
                if (e.dataTransfer.files.length > 0) {
                    this.$refs.fileInput.files = e.dataTransfer.files;
                    this.previewFiles({ target: this.$refs.fileInput });
                }
            }
        }
    }
</script>
