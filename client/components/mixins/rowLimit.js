// Renders big tables a page at a time: drawing every row of a full season (~700 rows x 30 columns)
// is the slowest thing the app does. Filters and search still cover every player.
export const PAGE_SIZE = 150;

export default {
	data() {
		return { rowLimit: PAGE_SIZE };
	},
	computed: {
		// Changing what is shown or how it is sorted starts again from the first page
		rowLimitResetKey() {
			const store = this.$store;
			return [store.active_position, store.active_filter, store.search_text, store.active_category].join('|');
		}
	},
	watch: {
		rowLimitResetKey() {
			this.rowLimit = PAGE_SIZE;
		}
	},
	methods: {
		limitRows(rows) {
			return rows.length > this.rowLimit ? rows.slice(0, this.rowLimit) : rows;
		},
		showMoreRows() {
			this.rowLimit += PAGE_SIZE;
		},
		showAllRows() {
			this.rowLimit = Infinity;
		}
	}
};
