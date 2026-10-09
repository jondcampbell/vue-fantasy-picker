<template>
    <div class="max-w-2xl space-y-5">
        <header>
            <h2 class="page-title">Import</h2>
            <p class="page-subtitle">Load a season stats CSV. The first row must be the column headers. Your team, taken and watch lists carry over to the new data.</p>
        </header>

        <label
            class="card flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed px-6 py-12 text-center transition hover:border-accent"
            :class="{ 'border-accent bg-accent/5': dragging }"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="dropFile">
            <span class="grid size-12 place-items-center rounded-full bg-accent/10 text-xl text-accent"><icon :name="fileName ? 'csv' : 'cloud'"></icon></span>
            <span v-if="fileName" class="font-medium">{{ fileName }}</span>
            <span v-else>
                <span class="font-medium text-accent">Choose a CSV file</span> or drag it here
            </span>
            <input type="file" accept=".csv,text/csv" id="importFile" ref="fileInput" v-on:change="previewFiles" hidden/>
        </label>

        <div class="flex items-center justify-between gap-4">
            <p class="text-sm text-muted">
                <template v-if="$store.players.length > 0"><icon name="check" class="mr-1 inline text-good"></icon>{{ $store.players.length }} players currently loaded</template>
                <template v-else>No players loaded yet</template>
            </p>
            <button type="button" @click="importPlayersFile" class="btn btn-primary" :disabled="! hasFiles">
                <icon name="upload"></icon> Import
            </button>
        </div>

        <list-issues></list-issues>
    </div>
</template>

<script>
    import papaparse from 'papaparse';
    import Swal from 'sweetalert2';
    import ListIssues from 'components/partials/ListIssues.vue';

    export default {
        components: {
            ListIssues
        },
        data: function () {
            return {
                hasFiles: false,
                fileName: '',
                dragging: false
            }
        },
        methods: {
            importPlayersFile: function (e) {
                var files = this.$refs.fileInput.files;
                if (files.length <= 0) {
                    return false;
                }

                var fr = new FileReader();
                let vuethis = this;

                fr.onload = function (e) {
                    papaparse.parse(e.target.result, {
                        complete: function(results) {
                            const issues = vuethis.$store.importPlayers(results.data);
                            vuethis.$refs.fileInput.value = '';
                            vuethis.hasFiles = false;
                            vuethis.fileName = '';
                            const attention = issues.ambiguous + issues.missing;
                            if (attention > 0) {
                                Swal.fire("Imported", `${attention} list ${attention === 1 ? 'entry needs' : 'entries need'} attention: see below.`, "warning");
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
