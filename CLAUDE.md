# vue-fantasy-picker

Personal tool for evaluating fantasy basketball (NBA head-to-head, category league) player stats from an imported CSV.

**Local only.** Never deployed or hosted anywhere. No backend, no API, no auth — everything runs in the browser and persists to localStorage. Don't add deployment, PWA, SEO or server concerns.

## Stack
- Vue 3 (Options API, `.vue` SFCs) + Vite 5
- Vuex 4 with `vuex-persist` (whole store persisted to localStorage)
- vue-router 4 (hash history, single `/` route — not used for page navigation)
- Bootswatch 4 "Flatly" (Bootstrap 4 classes: `ml-auto`, `badge-pill`, etc. — not Bootstrap 5)
- SCSS via `sass`; PostCSS config lives in `package.json`
- papaparse (CSV import), sweetalert2 (`Swal.fire`), Font Awesome via `client/components/Icon.vue`

## Commands
Package manager is **pnpm** (`node_modules/.pnpm`). `package-lock.json` and `yarn.lock` are stale leftovers.

- `pnpm dev` — Vite dev server at http://localhost:5173
- `pnpm build` — production build to `dist/` (use this to verify changes compile)
- `pnpm preview` — serve the build
- `pnpm test:unit` — Vitest unit tests in `test/unit/` (scoring logic)
- `pnpm lint` — xo 0.18 (old; may not handle `.vue` cleanly)

`pnpm test` (testcafe, `test/e2e`) is unmodified VuePack boilerplate and doesn't work.

## Structure
- `index.html` → `client/app.js` (the real entry: creates app, registers router, store, global `<icon>`, imports Bootswatch + SweetAlert CSS)
- `client/views/Home.vue` — the whole UI shell: navbar, sidebar, and screen switching
- `client/components/pages/` — screens: ImportData, Players, Scores (rankings), WatchList, MyTeam, Config
- `client/components/partials/` — PlayerFiltering, PlayerListScoring, PlayerRow, PlayerSummary, ScoreRow
- `client/store/index.js` — all state, import normalization, filtering getters
- `client/store/scoring.js` — pure scoring math (baseline averages, category scores); store getters delegate here. Keep it Vuex-free and covered by `test/unit/scoring.test.js`
- Vite aliases: `@` → `client`, plus `components`, `views`, `store`

**Legacy / dead code (Webpack-era, not used by Vite):** `build/`, `client/index.js`, `client/pwa.js`, `client/dev-client.js`, `client/promise-polyfill.js`, `static/`. Don't edit these to fix things; ask before deleting.

## How the app works
- **Navigation is by `state.config.screen` number, not routes:** 1 Import, 2 Players, 3 Rankings, 4 Configure, 5 Watch List, 6 My Team. Change via `dispatch('changeScreen', n)`.
- **CSV rows are arrays, columns are referenced by index.** Config holds `id_column`, `name_column`, `pos_column`, `games_column`, `minutes_column`, `key_columns` (scoring categories), `negative_columns` (lower is better, e.g. turnovers), `yearly_total_columns` (converted to per-game on import). Defaults in the store match the current CSV export format.
- **Import** (`importPlayers`): first row becomes `state.columns`; resets my team/taken/watch lists; dedupes players by id (first row wins), cleans names (strips `\…` suffix), coerces numerics, converts totals to per-game.
- **Evaluate** (`evaluatePlayers`): computes a baseline per key category (`categoryAverage` getter — respects `average_mode`, `average_pool_size`, `top_players`, min games/minutes), then scores each qualifying player into `state.scores`. Each category score is `value / baseline` (1.0 = average); lower-is-better columns use `2 − value / baseline` so higher is always better. `total` is the mean of the category scores; `aboveAverage` counts categories scored above 1.0. `average_mode`: 1 = mean, 2 = median. Config changes require re-clicking "Evaluate Players".
- Player lists (`my_team`, `taken_players`, `watch_list`) store integer player ids. Use the Set-based getters (`isWatched`, `isOnTeam`, `isTaken`, `filteredScores`, `bestScores`, `worstScores`) rather than recomputing in components.
- Store state shape changes interact with persisted localStorage — old saved state may be missing new keys.

## Data files
`samplestats.csv` and `2024-2025.csv` are sample/season stat exports for importing in the browser. Not loaded by code.

## Conventions
- Tabs for indentation in `.vue`/`.js` (despite `.editorconfig` saying spaces) — match the surrounding file.
- Store mutations are `UPPER_SNAKE`, actions camelCase; components dispatch actions, never commit directly.
- New SCSS: use `@use 'sass:color'` / `'sass:math'` instead of deprecated `lighten()`/`abs()`/`@import`.
- README has a running "Maintenance update" log; append to it only if asked.
