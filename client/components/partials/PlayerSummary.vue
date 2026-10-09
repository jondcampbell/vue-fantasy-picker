<template>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="text-sm"><span class="text-lg font-semibold tabular-nums">{{ playerCount }}</span> <span class="text-muted">players</span></div>
        <div class="flex flex-wrap gap-1.5">
            <span class="chip" v-for="position in $store.config.positions" :key="position">
                <span class="text-muted">{{ position }}</span> <span class="tabular-nums">{{ countPlayerPosition(position) }}</span>
            </span>
        </div>
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
                        return player[this.$store.config.pos_column] == position;
                    }).length;
                }
            }
        },
        computed: {
            playerCount() {
                return this.players.length;
            }
        }
    }
</script>
