<template>
    <div>
        <strong>Player count: {{ playerCount }}</strong><br />
        <span class="">SG: {{sgPlayers}}</span> &nbsp; &nbsp;
        <span class="">PG: {{pgPlayers}}</span> &nbsp; &nbsp;
        <span class="">C: {{cPlayers}}</span> &nbsp; &nbsp;
        <span class="">PF: {{pfPlayers}}</span> &nbsp; &nbsp;
        <span class="">SF: {{sfPlayers}}</span> &nbsp; &nbsp;
        <br />
    </div>
</template>

<script>
    export default {
        props: [
            'players',
            'type'
        ],
        methods: {
            countPlayerPosition(position){
                if(this.type == 'score'){
                    return this.players.filter(player => {
                        return player.playerPosition == position;
                    }).length;
                } else {
                    return this.players.filter(player => {
                        return player[this.$store.state.config.pos_column] == position;
                    }).length;
                }
            }
        },
        computed: {
            playerCount() {
                return this.players.length;
            },
            sgPlayers() {
                return this.countPlayerPosition('SG');
            },
            sfPlayers() {
                return this.countPlayerPosition('SF');
            },
            pfPlayers() {
                return this.countPlayerPosition('PF');
            },
            pgPlayers() {
                return this.countPlayerPosition('PG');
            },
            cPlayers() {
                return this.countPlayerPosition('C');
            }
        }
    }
</script>

<style lang="scss">

</style>
