import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./client', import.meta.url)),
			'components': fileURLToPath(new URL('./client/components', import.meta.url)),
			'views': fileURLToPath(new URL('./client/views', import.meta.url)),
			'store': fileURLToPath(new URL('./client/store', import.meta.url))
		}
	},
	server: {
		port: 5173,
		open: false
	}
});
