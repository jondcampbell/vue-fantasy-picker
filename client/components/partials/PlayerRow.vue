<template>
    <tr>
        <td class="pin left-0 w-28 min-w-28 py-0.5">
            <list-toggles :playerKey="playerKey"></list-toggles>
        </td>
        <td v-for="(value, index) in player" :key="index" :class="[columnClasses[index], { 'text-right': isNumeric(value) }]">{{ index == $store.config.pos_column ? positionLabel(value) : value }}</td>
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
            // Every position the player can fill (ESPN eligibility included), e.g. "PG, SG"
            positionLabel(value) {
                return this.$store.eligiblePositions(this.playerKey).join(', ') || value;
            },
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
