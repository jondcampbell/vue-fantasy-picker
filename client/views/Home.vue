<template>
	<div class="min-h-screen">
		<header class="sticky top-0 z-30 flex h-14 items-center gap-6 border-b border-line bg-surface/85 px-4 backdrop-blur">

			<a class="flex shrink-0 items-center gap-2 font-semibold tracking-tight" href="#" @click.prevent="changeScreen(1)">
				<span class="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg"><icon name="basketball"></icon></span>
				Fantasy Stats Man
			</a>

			<nav class="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1" v-if="$store.state.scores.length > 0">
				<a href="#" class="pill" :class="{ 'pill-active': rankingTotalActive }" @click.prevent="changeScreen(3); changeCategory('total');">Overall</a>
				<a href="#" class="pill" v-for="column in $store.getters.keyColumns" :key="column"
					:class="{ 'pill-active': $store.state.config.screen == 3 && $store.getters.activeCategoryName == column }"
					@click.prevent="changeScreen(3); changeCategoryByName(column);">{{column}}</a>
			</nav>
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
						<ul class="space-y-0.5 text-sm">
							<li v-for="player in myPlayers" :key="player[$store.state.config.id_column]" class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-surface-2">
								<span class="truncate">{{ player[$store.state.config.name_column] }}</span>
								<span class="chip">{{ player[$store.state.config.pos_column] }}</span>
							</li>
						</ul>
					</section>

					<section v-if="takenPlayers.length > 0">
						<h3 class="label flex items-center gap-1.5"><span class="size-2 rounded-full bg-bad"></span>Taken · {{ takenPlayers.length }}</h3>
						<ul class="space-y-0.5 text-sm text-muted">
							<li v-for="player in takenPlayers" :key="player[$store.state.config.id_column]" class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-surface-2">
								<span class="truncate">{{ player[$store.state.config.name_column] }}</span>
								<span class="chip">{{ player[$store.state.config.pos_column] }}</span>
							</li>
						</ul>
					</section>
				</div>
			</aside>

			<main class="min-w-0 flex-1 p-4 sm:p-6" role="main">

				<template v-if="$store.state.config.screen == 1">
					<import-data></import-data>
				</template>

				<template v-if=" $store.state.config.screen == 2">
					<players></players>
				</template>

				<template v-if="$store.state.config.screen == 3 && $store.state.scores.length > 0">
					<scores></scores>
				</template>

				<template v-if="$store.state.config.screen == 5">
					<watch-list></watch-list>
				</template>

				<template v-if="$store.state.config.screen == 6">
					<my-team></my-team>
				</template>

				<template v-if="$store.state.config.screen == 4">
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

    export default {
        methods: {
        	changeScreen(newScreen) {
        	    this.$store.dispatch('changeScreen', newScreen);
			},
			changeCategoryByName(categoryName) {
        	    let categoryIndex = this.$store.state.columns.findIndex(function(column, index) {
					return column == categoryName;
				});
        	    this.changeCategory(categoryIndex);
			},
			changeCategory(category) {
        	    this.$store.dispatch('changeActiveCategory', category);
			}
		},
        computed: {
            screen() {
                return this.$store.state.config.screen;
            },
            rankingTotalActive() {
                return this.screen == 3 && this.$store.state.active_category == 'total';
            },
            navItems() {
                const state = this.$store.state;
                const hasScores = state.scores.length > 0;
                return [
                    { screen: 1, label: 'Import', icon: 'cloud', visible: true, active: this.screen == 1, done: state.players.length > 0, onClick: () => this.changeScreen(1) },
                    { screen: 2, label: 'Players', icon: 'list', visible: true, active: this.screen == 2, done: hasScores, onClick: () => this.changeScreen(2) },
                    { screen: 3, label: 'Rankings', icon: 'trophy', visible: hasScores, active: this.rankingTotalActive, onClick: () => { this.changeScreen(3); this.changeCategory('total'); } },
                    { screen: 5, label: 'Watch List', icon: 'binoculars', visible: true, active: this.screen == 5, onClick: () => this.changeScreen(5) },
                    { screen: 6, label: 'My Team', icon: 'users', visible: true, active: this.screen == 6, onClick: () => this.changeScreen(6) },
                    { screen: 4, label: 'Configure', icon: 'gear', visible: true, active: this.screen == 4, onClick: () => this.changeScreen(4) }
                ];
            },
            myPlayers() {
                return this.$store.getters.myPlayers;
            },
			takenPlayers() {
                return this.$store.getters.takenPlayers;
            },
			watchList() {
                return this.$store.getters.watchList;
            }
		},
        components: {
            ImportData,
			Config,
			Players,
			Scores,
			WatchList,
			MyTeam
        }
    }
</script>
