<template>
	<div class="page">
		<nav class="navbar navbar-toggleable-md navbar-inverse bg-inverse fixed-top">

			<a class="navbar-brand" href="#">Fantasy Stats Man</a>
			<button class="navbar-toggler d-lg-none" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
				<span class="navbar-toggler-icon"></span>
			</button>

			<div class="collapse navbar-collapse" id="navbarsExampleDefault">
				<ul class="navbar-nav mr-auto">
					<li class="nav-item active">
						<a class="nav-link" href="#">Home <span class="sr-only">(current)</span></a>
					</li>
					<li class="nav-item">
						<a class="nav-link" href="#">Settings</a>
					</li>
				</ul>
			</div>
		</nav>

		<div class="container-fluid">
			<div class="row">
				<nav class="col-sm-3 col-md-2 d-none d-sm-block bg-light sidebar">
					<ul class="nav nav-pills flex-column">
						<li class="nav-item">
							<a class="nav-link active" href="#">Import <span class="sr-only">(current)</span></a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#">Players</a>
						</li>
						<li class="nav-item">
							<a class="nav-link" href="#">Categories</a>
						</li>
					</ul>
				</nav>

				<main class="col-sm-9 ml-sm-auto col-md-10 pt-3" role="main">
					<h1>Dashboard</h1>



					<counter></counter>
					<import-data></import-data>
					Player count {{ totalPlayers }}<br />
					Cool tabs<br />
					Table of data<br />



					<section class="row text-center placeholders">
						<div class="col-6 col-sm-3 placeholder">

						</div>
					</section>

					<h2>Section title</h2>
					<div class="table-responsive">
					</div>
				</main>
			</div>
		</div>




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

