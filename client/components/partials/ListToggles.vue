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
            'playerKey'
        ],
        methods: {
            toggleList(list, isOn) {
                this.$store[isOn ? 'removeFromList' : 'addToList']({ list: list, key: this.playerKey });
            }
        },
        computed: {
            toggles() {
                const store = this.$store;
                return [
                    { list: 'watch_list', icon: 'binoculars', on: store.isWatched(this.playerKey), onClass: 'text-accent', onTitle: 'Add to watch list', offTitle: 'Remove from watch list' },
                    { list: 'my_team', icon: 'users', on: store.isOnTeam(this.playerKey), onClass: 'text-good', onTitle: 'Add to my team', offTitle: 'Remove from my team' },
                    { list: 'taken_players', icon: 'exclamation', on: store.isTaken(this.playerKey), onClass: 'text-bad', onTitle: 'Mark as taken', offTitle: 'Mark as available' }
                ];
            }
        }
    }
</script>
