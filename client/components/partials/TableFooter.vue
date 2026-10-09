<template>
    <div class="sticky left-0 flex flex-wrap items-center gap-3 border-t border-line px-3 py-2.5 text-sm" v-if="shown < total">
        <span class="text-muted">Showing {{ shown }} of {{ total }} players</span>
        <button type="button" class="btn btn-ghost py-1" @click="$emit('more')">Show {{ Math.min(pageSize, total - shown) }} more</button>
        <button type="button" class="btn btn-ghost py-1" @click="$emit('all')">Show all</button>
    </div>
</template>

<script>
    import { PAGE_SIZE } from 'components/mixins/rowLimit.js';

    export default {
        props: [
            'shown',
            'total'
        ],
        emits: ['more', 'all'],
        data() {
            return { pageSize: PAGE_SIZE };
        }
    }
</script>
