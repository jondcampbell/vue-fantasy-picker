<template>
	<div class="page">
        <h2>Fantasy Stats</h2>
		<counter></counter>
		<import-data></import-data>
		Player count {{ totalPlayers }}<br />
		Cool tabs<br />
		Table of data<br />

	</div>
</template>

<script>
	import Counter from 'components/Counter';
	import ImportData from 'components/ImportData';

	export default {
		computed: {
	        totalPlayers() {
              return this.$store.state.players.length;
            }
		},
		components: {
			Counter,
			ImportData
		}
	}
</script>
