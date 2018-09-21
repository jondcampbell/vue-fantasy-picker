<template>
    <div class="config-wrapper">
        <h2>Configure</h2>
        <section class="row ">
            <div class="col-6">
                <h5>General</h5>
                Average Mode: {{ $store.state.config.average_mode }}<br />
                Teams in League: {{ $store.state.config.teams_in_league }}<br />
                Players per team: {{ $store.state.config.players_per_team }}<br />
                Top Players: {{ $store.state.config.top_players }}<br />
                Minimum Games Played: {{ $store.state.config.min_games_played }}<br />
                Positions: {{ positions }}


            </div>
            <div class="col-6">
                <h5>Columns</h5>
                Name Column: {{ $store.state.config.name_column }}<br />
                Position Column: {{ $store.state.config.pos_column }}<br />
                Games Column: {{ $store.state.config.games }}<br />
                Key Columns: {{ $store.state.config.key_columns }}<br />
                Negative Columns: {{ $store.state.config.negative_columns }}<br />
                Yearly Total Columns: {{ $store.state.config.yearly_total_columns }}<br />
            </div>
        </section>

    </div>
</template>

<script>
    import sweetAlert from 'sweetalert2/src/sweetalert2.all.js';
    export default {
        methods: {},
        computed: {
        positions: function () {
            let positions = this.$store.state.config.positions;
            return positions.join(',');
        }
      }
    }
</script>

<style lang="scss">
    .config-wrapper {
    }
</style>
