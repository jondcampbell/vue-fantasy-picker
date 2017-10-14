<template>
	<div class="fantasy-picker-page">
		<nav class="navbar navbar-toggleable-md navbar-inverse bg-inverse fixed-top">

			<a class="navbar-brand" href="#">Fantasy Stats Man</a>
			<button class="navbar-toggler d-lg-none" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
				<span class="navbar-toggler-icon"></span>
			</button>

			<div class="collapse navbar-collapse" id="navbarsExampleDefault">
				<ul class="navbar-nav mr-auto">
					<li class="nav-item active">
						<a class="nav-link" href="#"></a>
					</li>
					<li class="nav-item">
						<a class="nav-link" href="#"></a>
					</li>
				</ul>
			</div>
		</nav>

		<div class="container-fluid">
			<div class="row">
				<nav class="col-sm-3 col-md-2 d-none d-sm-block bg-light sidebar">
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
							<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 4}" @click="changeScreen(4)">Configure </a>
						</li>
						<li class="nav-item" v-if="$store.state.scores.length > 0">
							Scoring Categories:<br />
							<ul class="nav nav-pills flex-column">
								<li class="nav-item" v-for="(column, index) in $store.getters.keyColumns">
									<a class="nav-link" href="#" v-bind:class="{active: $store.state.config.screen == 3 && $store.getters.activeCategoryName == column}" @click="changeScreen(3); changeCategoryByName(column);">{{column}}</a>
								</li>
							</ul>
						</li>
					</ul>
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

					<template v-if="$store.state.config.screen == 4">
						<config></config>
					</template>


				</main>
			</div>
		</div>




	</div>
</template>

<script>
    import ImportData from 'components/ImportData';
    import Config from 'components/Config';
    import Players from 'components/Players';
    import Scores from 'components/Scores';

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
        computed: {},
        components: {
            ImportData,
			Config,
			Players,
			Scores
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

