<template>
	<div class="fantasy-picker-page">
		<nav class="navbar navbar-expand-lg navbar-dark bg-primary fixed-top">

			<a class="navbar-brand" href="#">Fantasy Stats Man</a>

			<div class="collapse navbar-collapse text-light" v-if="$store.state.scores.length > 0">

				<ul class="navbar-nav ml-auto nav-pills">
					<li class="nav-item" v-for="(column, index) in $store.getters.keyColumns">
						<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 3 && $store.getters.activeCategoryName == column}" @click="changeScreen(3); changeCategoryByName(column);">{{column}}</a>
					</li>
				</ul>

			</div>
		</nav>

		<div class="container-fluid">
			<div class="row">
				<nav class="col-sm-3 col-md-2 d-none d-sm-block sidebar">
					<ul class="nav nav-pills flex-column">
						<li class="nav-item">
							<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 1}" @click="changeScreen(1)">Import <icon v-if="$store.state.players.length > 0" name="check"></icon></a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 2}" @click="changeScreen(2)">Players <icon v-if="$store.state.scores.length > 0" name="check"></icon></a>
						</li>
						<li class="nav-item">
							<a class="nav-link" v-if="$store.state.scores.length > 0" href="#" v-bind:class="{active: $store.state.config.screen == 3 && $store.state.active_category == 'total'}" @click="changeScreen(3); changeCategory('total');">Player Rankings</a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 5}" @click="changeScreen(5)">Watch List </a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 6}" @click="changeScreen(6)">My Team </a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 4}" @click="changeScreen(4)">Configure </a>
						</li>
					</ul>

					<div class="card text-white bg-success mb-3" style="max-width: 20rem;" v-if="myPlayers.length > 0">
					  <div class="card-header">My Team</div>
					  <div class="card-body">
						<ul v-for="player in myPlayers" class="list-group text-dark">
							<li class="list-group-item">{{ player[$store.state.config.name_column] }} <span class="badge badge-primary badge-pill">{{ player[$store.state.config.pos_column] }}</span></li>
						</ul>
					  </div>
					</div>

					<div class="card text-white bg-danger mb-3" style="max-width: 18rem;" v-if="takenPlayers.length > 0">
					  <div class="card-header">Taken Players</div>
					  <div class="card-body">
						<ul v-for="player in takenPlayers" class="list-group text-dark">
							<li class="list-group-item">{{ player[$store.state.config.name_column] }} <span class="badge badge-primary badge-pill">{{ player[$store.state.config.pos_column] }}</span></li>
						</ul>
					  </div>
					</div>


				</nav>

				<main class="col-sm-9 ml-sm-auto col-md-10" role="main">

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




	</div>
</template>

<script>
    import ImportData from 'components/pages/ImportData';
    import Config from 'components/pages/Config';
    import Players from 'components/pages/Players';
    import Scores from 'components/pages/Scores';
    import WatchList from 'components/pages/WatchList';
    import MyTeam from 'components/pages/MyTeam';

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
<style lang="scss">
.fantasy-picker-page{
	.btn.btn-primary, button{
		cursor: pointer;
	}
}
</style>

