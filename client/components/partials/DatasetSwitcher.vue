<template>
    <div class="flex flex-wrap items-center gap-2" v-if="datasets.length > 1">
        <span class="label mb-0">Stats</span>
        <div class="flex flex-wrap gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
            <button type="button" v-for="dataset in datasets" :key="dataset.id"
                class="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition"
                :class="dataset.id === $store.active_dataset ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'"
                :aria-pressed="dataset.id === $store.active_dataset"
                :title="`${dataset.label} · ${dataset.source} · ${dataset.players} players`"
                @click="$store.useDataset(dataset.id)">{{ dataset.label }}</button>
        </div>
    </div>
</template>

<script>
    export default {
        computed: {
            datasets() {
                return this.$store.datasetList;
            }
        }
    }
</script>
