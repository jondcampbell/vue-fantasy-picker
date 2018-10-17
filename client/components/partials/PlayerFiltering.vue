<template>
    <div>
        Position:
        <select v-bind:value="$store.state.active_position" v-on:change="changePosition">
            <option value="all">All</option>
            <option v-for="position in $store.state.config.positions" v-bind:value="position">{{position}}</option>
        </select>
        Player Name:
        <input type="text" v-bind:value="$store.state.search_text"  v-on:input="changeSearchText"/>
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
            }
        },
        computed: {

        }
    }
</script>

<style lang="scss">

</style>
