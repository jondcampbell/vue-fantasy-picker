<template>
    <div class="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5" role="radiogroup" aria-label="Color theme">
        <button type="button" v-for="option in options" :key="option.value"
            class="grid size-7 cursor-pointer place-items-center rounded-md text-sm transition"
            :class="theme == option.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'"
            role="radio"
            :aria-checked="theme == option.value"
            :title="option.label"
            @click="setTheme(option.value)">
            <icon :name="option.icon"></icon>
        </button>
    </div>
</template>

<script>
    // Per-device preference, kept out of the store; index.html applies it before first paint
    const STORAGE_KEY = 'theme';

    const readTheme = function() {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            return saved === 'light' || saved === 'dark' ? saved : 'system';
        } catch (e) {
            return 'system';
        }
    };

    export default {
        data() {
            return {
                theme: readTheme(),
                options: [
                    { value: 'system', icon: 'desktop', label: 'Match system' },
                    { value: 'light', icon: 'sun', label: 'Light' },
                    { value: 'dark', icon: 'moon', label: 'Dark' }
                ]
            };
        },
        methods: {
            setTheme(theme) {
                this.theme = theme;
                const root = document.documentElement;
                if (theme === 'system') {
                    delete root.dataset.theme;
                } else {
                    root.dataset.theme = theme;
                }
                try {
                    if (theme === 'system') {
                        window.localStorage.removeItem(STORAGE_KEY);
                    } else {
                        window.localStorage.setItem(STORAGE_KEY, theme);
                    }
                } catch (e) {
                    // Storage unavailable; the choice still applies for this visit
                }
            }
        }
    }
</script>
