<template>
	<div class="min-h-screen">
		<header class="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-surface/85 px-4 backdrop-blur">

			<a class="flex shrink-0 items-center gap-2 font-semibold tracking-tight" href="#" @click.prevent="changeScreen(1)">
				<span class="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg"><icon name="basketball"></icon></span>
				Fantasy Stats Man
			</a>

			<theme-toggle class="ml-auto"></theme-toggle>
		</header>

		<div class="flex flex-col sm:flex-row">
			<aside class="shrink-0 border-b border-line bg-surface p-3 sm:sticky sm:top-14 sm:h-[calc(100vh-3.5rem)] sm:w-60 sm:overflow-y-auto sm:border-r sm:border-b-0">
				<nav class="flex gap-1 overflow-x-auto sm:flex-col">
					<template v-for="item in navItems" :key="item.screen">
						<a href="#" v-if="item.visible" class="nav-item" :class="{ 'nav-item-active': item.active }" @click.prevent="item.onClick">
							<icon :name="item.icon"></icon>
							<span class="flex-1">{{ item.label }}</span>
							<icon v-if="item.done" name="check" class="text-good"></icon>
						</a>
					</template>
				</nav>

				<div class="mt-6 hidden space-y-4 sm:block">
					<section v-if="myPlayers.length > 0">
						<h3 class="label flex items-center gap-1.5"><span class="size-2 rounded-full bg-good"></span>My Team · {{ myPlayers.length }}</h3>
						<div class="mb-2 flex flex-wrap gap-1" v-if="$store.openRosterSlots.length > 0">
							<span class="chip text-warn" v-for="open in $store.openRosterSlots" :key="open.slot" :title="`Open roster slot: ${open.slot}`">{{ open.slot }}<template v-if="open.count > 1"> ×{{ open.count }}</template></span>
						</div>
						<ul class="space-y-0.5 text-sm">
							<li v-for="player in myPlayers" :key="$store.rowKeys.get(player)" class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-surface-2">
								<span class="truncate">{{ player[$store.config.name_column] }}</span>
								<span class="chip">{{ player[$store.config.pos_column] }}</span>
							</li>
						</ul>
					</section>

					<section v-if="takenPlayers.length > 0">
						<h3 class="label flex items-center gap-1.5"><span class="size-2 rounded-full bg-bad"></span>Taken · {{ takenPlayers.length }}</h3>
						<ul class="space-y-0.5 text-sm text-muted">
							<li v-for="player in takenPlayers" :key="$store.rowKeys.get(player)" class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-surface-2">
								<span class="truncate">{{ player[$store.config.name_column] }}</span>
								<span class="chip">{{ player[$store.config.pos_column] }}</span>
							</li>
						</ul>
					</section>
				</div>
			</aside>

			<main class="min-w-0 flex-1 p-4 sm:p-6" role="main">

				<template v-if="$store.config.screen == 1">
					<import-data></import-data>
				</template>

				<template v-if=" $store.config.screen == 2">
					<players></players>
				</template>

				<template v-if="$store.config.screen == 3 && $store.scores.length > 0">
					<scores></scores>
				</template>

				<template v-if="$store.config.screen == 5">
					<watch-list></watch-list>
				</template>

				<template v-if="$store.config.screen == 6">
					<my-team></my-team>
				</template>

				<template v-if="$store.config.screen == 4">
					<config></config>
				</template>

			</main>
		</div>
	</div>
</template>

<script>
    import ImportData from 'components/pages/ImportData.vue';
    import Config from 'components/pages/Config.vue';
    import Players from 'components/pages/Players.vue';
    import Scores from 'components/pages/Scores.vue';
    import WatchList from 'components/pages/WatchList.vue';
    import MyTeam from 'components/pages/MyTeam.vue';
    import ThemeToggle from 'components/partials/ThemeToggle.vue';

    export default {
        methods: {
        	changeScreen(newScreen) {
        	    this.$store.changeScreen(newScreen);
			}
		},
        computed: {
            screen() {
                return this.$store.config.screen;
            },
            navItems() {
                const state = this.$store;
                const hasScores = state.scores.length > 0;
                return [
                    { screen: 1, label: 'Import', icon: 'cloud', visible: true, active: this.screen == 1, done: state.players.length > 0, onClick: () => this.changeScreen(1) },
                    { screen: 2, label: 'Players', icon: 'list', visible: true, active: this.screen == 2, done: hasScores, onClick: () => this.changeScreen(2) },
                    { screen: 3, label: 'Rankings', icon: 'trophy', visible: hasScores, active: this.screen == 3, onClick: () => this.changeScreen(3) },
                    { screen: 5, label: 'Watch List', icon: 'binoculars', visible: true, active: this.screen == 5, onClick: () => this.changeScreen(5) },
                    { screen: 6, label: 'My Team', icon: 'users', visible: true, active: this.screen == 6, onClick: () => this.changeScreen(6) },
                    { screen: 4, label: 'Configure', icon: 'gear', visible: true, active: this.screen == 4, onClick: () => this.changeScreen(4) }
                ];
            },
            myPlayers() {
                return this.$store.myPlayers;
            },
			takenPlayers() {
                return this.$store.takenPlayers;
            },
			watchList() {
                return this.$store.watchList;
            }
		},
        components: {
            ImportData,
			Config,
			Players,
			Scores,
			WatchList,
			MyTeam,
			ThemeToggle
        }
    }
</script>
