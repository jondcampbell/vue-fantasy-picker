<template>
  <span aria-hidden="true">{{ symbol }}</span>
</template>

<script>
export default {
	name: 'Icon',
	props: {
		name: { type: String, required: true }
	},
	computed: {
		symbol() {
			switch (this.name) {
				case 'upload': return '⬆️';
				case 'binoculars': return '👀';
				case 'users': return '👥';
				case 'exclamation': return '❗';
				case 'check': return '✓';
				default: return '•';
			}
		}
	}
}
</script>

<style scoped>
span {
	display: inline-block;
	line-height: 1;
}
</style>
