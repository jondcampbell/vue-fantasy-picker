<template>
    <div class="import-data-wrapper">
        Import CSV
        <input type="file" id="importFile" value="Import" /><br />
        <button @click="importPlayersFile" class="btn btn-primary"> Upload &nbsp; <icon name="upload"></icon></button>
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

                fr.onload = function (e) {

                    papaparse.parse(e.target.result, {
                        complete: function(results) {
                            console.log("Finished:", results.data);
                        }
                    });
                    /*
                    var result = JSON.parse(e.target.result);
                    console.log(result);
                    */
                    //this_vue.quote_items = result;

                    sweetAlert("Woot!", "We imported your items", "success");
                }

                fr.readAsText(files.item(0));
            }
        }
    }
</script>

<style lang="scss">
    .import-data-wrapper {
        color:red;
    }
</style>
