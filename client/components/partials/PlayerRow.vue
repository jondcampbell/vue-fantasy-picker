<template>
    <tr>
        <td class="pin left-0 w-28 min-w-28 py-0.5">
            <list-toggles :playerKey="playerKey"></list-toggles>
        </td>
        <td v-for="(value, index) in player" :key="index" :class="[columnClasses[index], { 'text-right': isNumeric(value) }]">{{ value }}</td>
    </tr>
</template>

<script>
    import ListToggles from 'components/partials/ListToggles.vue';

    export default {
        props: [
            'index',
            'player',
            'columnClasses'
        ],
        methods: {
            isNumeric(value) {
                return typeof value === 'number' || (value !== '' && !isNaN(value));
            }
        },
        computed: {
            playerKey() {
                return this.$store.rowKeys.get(this.player);
            }
        },
        components: {
            ListToggles
        }
    }
</script>
