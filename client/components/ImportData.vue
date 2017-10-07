<template>
    <div class="import-data-wrapper">
        <h2>Import</h2>
        <section class="row ">
            <div class="col-6">
                <label class="btn btn-primary">
                    Browse <input type="file" id="importFile" value="Import" hidden/>
                </label>
            </div>
            <div class="col-6">
                <button @click="importPlayersFile" class="btn btn-primary"> Upload &nbsp; <icon name="upload"></icon></button>
            </div>
        </section>

    </div>
</template>

<script>
    import papaparse from 'papaparse';
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    export default {
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
                            console.log("Finished");
                            vuethis.$store.dispatch('importPlayers', results.data);
                        }
                    });

                    sweetAlert("Woot!", "We imported your players", "success");
                }

                fr.readAsText(files.item(0));
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
