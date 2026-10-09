<template>
    <div class="grid gap-3 sm:grid-cols-[10rem_1fr_12rem]">
        <label>
            <span class="label">Position</span>
            <select class="field" v-bind:value="$store.active_position" v-on:change="changePosition">
                <option value="all">All</option>
                <option v-for="position in $store.config.positions" :key="position" v-bind:value="position">{{position}}</option>
            </select>
        </label>
        <label>
            <span class="label">Player Name</span>
            <span class="relative block">
                <icon name="search" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"></icon>
                <input type="search" class="field pl-9" placeholder="Search players…" v-bind:value="$store.search_text" v-on:input="changeSearchText"/>
            </span>
        </label>
        <label>
            <span class="label">Availability</span>
            <select class="field" v-bind:value="$store.active_filter" v-on:change="changeFilter">
                <option value="none">Show All</option>
                <option value="untaken">Available</option>
                <option value="mine">Mine</option>
                <option value="watch">Watch</option>
                <option value="taken">Other Teams</option>
            </select>
        </label>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:col-span-3">
            <label class="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" class="rounded border-line text-accent" :checked="$store.fits_open_slots" @change="$store.changeFitsOpenSlots($event.target.checked)"/>
                Fits my open slots
            </label>
            <span class="text-xs text-muted" v-if="$store.my_team.length === 0">Add players to My Team to see which slots are open.</span>
            <span class="text-xs text-muted" v-else-if="$store.openStarterSlots.length === 0">Your starting lineup is full.</span>
            <span class="flex flex-wrap items-center gap-1 text-xs text-muted" v-else>
                Open:
                <span class="chip text-warn" v-for="open in $store.openStarterSlots" :key="open.slot">{{ open.slot }}<template v-if="open.count > 1"> ×{{ open.count }}</template></span>
            </span>
        </div>
    </div>
</template>

<script>
    export default {
        props: [],
        data() {
            return { searchTimer: null };
        },
        methods: {
            changePosition(event){
                let position = event.target.value;
        	    this.$store.changeActivePosition(position);
            },
            changeSearchText(event){
                const value = event.target.value;
                if (this.searchTimer) {
                    clearTimeout(this.searchTimer);
                }
                this.searchTimer = setTimeout(() => {
        	        this.$store.changeSearchText(value);
                }, 200);
            },
            changeFilter(event){
                let filter = event.target.value;
        	    this.$store.changeActiveFilter(filter);
            }
        },
        computed: {

        }
    }
</script>
