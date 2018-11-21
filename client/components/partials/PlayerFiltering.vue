<template>
    <div>
        Position:
        <select v-bind:value="$store.state.active_position" v-on:change="changePosition">
            <option value="all">All</option>
            <option v-for="position in $store.state.config.positions" v-bind:value="position">{{position}}</option>
        </select>
        &nbsp; &nbsp; &nbsp;
        Player Name:
        <input type="text" v-bind:value="$store.state.search_text"  v-on:input="changeSearchText"/>
        &nbsp; &nbsp; &nbsp;
        Availability:
        <select v-bind:value="$store.state.active_filter" v-on:change="changeFilter">
            <option value="none">Show All</option>
            <option value="untaken">Available</option>
            <option value="mine">Mine</option>
            <option value="watch">Watch</option>
            <option value="taken">Other Teams</option>
        </select>
    </div>
</template>

<script>
    export default {
        props: [],
        methods: {
            changePosition(event){
                let position = event.target.value;
        	    this.$store.dispatch('changeActivePosition', position);
            },
            changeSearchText(event){
                let search_text = event.target.value;
        	    this.$store.dispatch('changeSearchText', search_text);
            },
            changeFilter(event){
                let filter = event.target.value;
        	    this.$store.dispatch('changeActiveFilter', filter);
            }
        },
        computed: {

        }
    }
</script>

<style lang="scss">

</style>
