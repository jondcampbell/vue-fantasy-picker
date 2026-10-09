<template>
    <div class="flex items-center gap-0.5">
        <button type="button" v-for="toggle in toggles" :key="toggle.list"
            class="grid size-7 cursor-pointer place-items-center rounded-md transition hover:bg-line"
            :class="toggle.on ? toggle.onClass : 'text-muted/50 hover:text-fg'"
            :title="toggle.on ? toggle.offTitle : toggle.onTitle"
            :aria-pressed="toggle.on"
            @click="toggleList(toggle.list, toggle.on)">
            <icon :name="toggle.icon"></icon>
        </button>
    </div>
</template>

<script>
    export default {
        props: [
            'playerId'
        ],
        methods: {
            toggleList(list, isOn) {
                this.$store[isOn ? 'removeFromList' : 'addToList']({ list: list, player_id: this.playerId });
            }
        },
        computed: {
            toggles() {
                const store = this.$store;
                return [
                    { list: 'watch_list', icon: 'binoculars', on: store.isWatched(this.playerId), onClass: 'text-accent', onTitle: 'Add to watch list', offTitle: 'Remove from watch list' },
                    { list: 'my_team', icon: 'users', on: store.isOnTeam(this.playerId), onClass: 'text-good', onTitle: 'Add to my team', offTitle: 'Remove from my team' },
                    { list: 'taken_players', icon: 'exclamation', on: store.isTaken(this.playerId), onClass: 'text-bad', onTitle: 'Mark as taken', offTitle: 'Mark as available' }
                ];
            }
        }
    }
</script>
