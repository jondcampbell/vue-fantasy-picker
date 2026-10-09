import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

// Correctness rules only; formatting is left to the existing code style
export default [
	{
		ignores: ['dist/', 'node_modules/', '.idea/']
	},
	js.configs.recommended,
	...pluginVue.configs['flat/essential'],
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: globals.browser
		},
		rules: {
			// Unused callback/getter params like (state, getters) are fine
			'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }],
			// Single-word screen/component names (Home, Players, Icon) are the convention here
			'vue/multi-word-component-names': 'off'
		}
	},
	{
		files: ['vite.config.js', 'eslint.config.js', 'server/**/*.js', 'test/**/*.js'],
		languageOptions: {
			globals: globals.node
		}
	}
];
