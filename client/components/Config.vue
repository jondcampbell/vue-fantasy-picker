<template>
    <div class="config-wrapper">
        <h2>Configure</h2>
        <section class="row ">
            <div class="col-6">
                <h5>General</h5>
                Average Mode: {{ $store.state.config.average_mode }}<br />
                Top Players: {{ $store.state.config.top_players }}<br />

            </div>
            <div class="col-6">
                <h5>Columns</h5>
                Name Column: {{ $store.state.config.name_column }}<br />
                Position Column: {{ $store.state.config.pos_column }}<br />
                Games Column: {{ $store.state.config.games }}<br />
                Key Columns: {{ $store.state.config.key_columns }}<br />
                Negative Columns: {{ $store.state.config.negative_columns }}<br />
            </div>
        </section>

    </div>
</template>

<script>
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    export default {
        methods: {}
    }
</script>

<style lang="scss">
    .config-wrapper {
    }
</style>
