import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { espnLeaguePlugin } from './server/espnLeague.js';

export default defineConfig(({ mode }) => {
	// ESPN_* settings from .env.local, used only by the local league proxy (never exposed to the browser)
	const env = loadEnv(mode, process.cwd(), 'ESPN_');

	return {
		plugins: [vue(), tailwindcss(), espnLeaguePlugin(env)],
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
	};
});
