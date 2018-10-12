<template>
    <div class="import-data-wrapper">
        <h2>Import</h2>
        <section class="row ">
            <div class="col-6">
                <label class="btn btn-primary">
                    Browse <input type="file" id="importFile" v-on:change="previewFiles" value="Import" hidden/>
                </label>
            </div>
            <div class="col-6">
                <button @click="importPlayersFile" class="btn btn-primary" v-bind:class="{ disabled : ! hasFiles }"> Upload &nbsp; <icon name="upload"></icon></button>
            </div>
        </section>

    </div>
</template>

<script>
    import papaparse from 'papaparse';
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    export default {
        data: function () {
            return {
                hasFiles: false
            }
        },
        methods: {
            importPlayersFile: function (e) {
                var files = document.getElementById('importFile').files;
                if (files.length <= 0) {
                    return false;
                }

                var fr = new FileReader();
                let vuethis = this;

                fr.onload = function (e) {
                    papaparse.parse(e.target.result, {
                        complete: function(results) {
                            vuethis.$store.dispatch('importPlayers', results.data);
                        }
                    });

                    sweetAlert("Woot!", "We imported your players", "success");
                }

                fr.readAsText(files.item(0));
            },
            previewFiles(e) {
                if(e.target.files.length > 0){
                    this.hasFiles = true;
                } else {
                    this.hasFiles = false;
                }
           }
        },
        computed: {
            // a computed getter
            fileSelected: function () {
              return this.hasFiles;
            }
          }
    }
    // TODO: Add nice js for feedback once they select an import file
    // https://www.abeautifulsite.net/whipping-file-inputs-into-shape-with-bootstrap-3
</script>

<style lang="scss">
    .import-data-wrapper {
    }
</style>
