# vue-fantasy-picker

Personal tool for evaluating fantasy basketball (NBA head-to-head, category league) player stats from an imported CSV.

**Local only.** Never deployed or hosted anywhere. No backend, no API, no auth — everything runs in the browser and persists to localStorage. Don't add deployment, PWA, SEO or server concerns.

## Stack
- Vue 3 (Options API, `.vue` SFCs) + Vite 5; package is ESM (`"type": "module"`)
- Vuex 4; whole store persisted to localStorage (key `vuex`) by our own plugin in `client/store/persist.js`
- vue-router 4 (hash history, single `/` route — not used for page navigation)
- Tailwind CSS v4 via `@tailwindcss/vite` + `@tailwindcss/forms` (no `tailwind.config.js`; config lives in CSS). No Sass, no PostCSS config.
- papaparse (CSV import), sweetalert2 (`Swal.fire`), Font Awesome via `client/components/Icon.vue`

## Commands
Package manager is **pnpm** (`node_modules/.pnpm`). `package-lock.json` and `yarn.lock` are stale leftovers.

- `pnpm dev` — Vite dev server at http://localhost:5173
- `pnpm build` — production build to `dist/` (use this to verify changes compile)
- `pnpm preview` — serve the build
- `pnpm test:unit` — Vitest: `scoring.test.js` (scoring math), `persist.test.js` (restore/migration) and `ui.smoke.test.js` (mounts every screen with `samplestats.csv` in happy-dom; fails on any Vue warning)
- `pnpm lint` — xo 0.18 (old; may not handle `.vue` cleanly)

`pnpm test` (testcafe, `test/e2e`) is unmodified VuePack boilerplate and doesn't work.

## Structure
- `index.html` → `client/app.js` (the real entry: creates app, registers router, store, global `<icon>`, imports SweetAlert CSS + `client/styles/app.css`)
- `client/views/Home.vue` — the whole UI shell: sticky header, sidebar nav + roster lists, and screen switching. Ranking category switching (pills + sortable headers) lives in `Scores.vue`
- `client/components/pages/` — screens: ImportData, Players, Scores (rankings), WatchList, MyTeam, Config
- `client/components/partials/` — PlayerTable (raw-stats table used by Players/Watch List/My Team) + PlayerRow, ScoreRow, ListToggles (watch/team/taken buttons shared by both row types), PlayerFiltering, PlayerSummary, PlayerListScoring
- `client/styles/app.css` — Tailwind entry: semantic color tokens, light/dark values, shared component classes
- `client/store/index.js` — all state, import normalization, filtering getters
- `client/store/scoring.js` — pure scoring math (baseline averages, category scores); store getters delegate here. Keep it Vuex-free and covered by `test/unit/scoring.test.js`
- Vite aliases: `@` → `client`, plus `components`, `views`, `store`

**Legacy / dead code (Webpack-era, not used by Vite):** `build/`, `client/index.js`, `client/pwa.js`, `client/dev-client.js`, `client/promise-polyfill.js`, `static/`. Don't edit these to fix things; ask before deleting.

## How the app works
- **Navigation is by `state.config.screen` number, not routes:** 1 Import, 2 Players, 3 Rankings, 4 Configure, 5 Watch List, 6 My Team. Change via `dispatch('changeScreen', n)`.
- **CSV rows are arrays, columns are referenced by index.** Config holds `id_column`, `name_column`, `pos_column`, `games_column`, `minutes_column`, `key_columns` (scoring categories, averaged into the total), `ranking_only_columns` (scored and rankable, not in the total; default BLK, TOV), `negative_columns` (lower is better, e.g. turnovers), `yearly_total_columns` (converted to per-game on import). Defaults in the store match the current CSV export format.
- **Import** (`importPlayers`): first row becomes `state.columns`; resets my team/taken/watch lists; dedupes players by id (first row wins), cleans names (strips `\…` suffix), coerces numerics, converts totals to per-game.
- **Evaluate** (`evaluatePlayers`): computes a baseline per key category (`categoryAverage` getter — respects `average_mode`, `average_pool_size`, min games/minutes; the `top_players` setting is currently unused), then scores each qualifying player into `state.scores`. Each category score is `value / baseline` (1.0 = average); lower-is-better columns use `2 − value / baseline` so higher is always better. `total` is the mean of the category scores; `aboveAverage` counts categories scored above 1.0. `average_mode`: 1 = mean, 2 = median. Config changes require re-clicking "Evaluate Players".
- Player lists (`my_team`, `taken_players`, `watch_list`) store integer player ids. Use the Set-based getters (`isWatched`, `isOnTeam`, `isTaken`, `filteredScores`, `bestScores`, `worstScores`) rather than recomputing in components.
- **Persistence:** on load, saved top-level keys and `config` keys replace defaults wholesale (arrays are never merged by index); keys missing from saved state fall back to defaults. Saves are coalesced to one write per tick. When changing a default that saved state already has (e.g. adding to `yearly_total_columns`), add a migration in `restoreState()` and a test in `test/unit/persist.test.js` — users' saved values otherwise win.

## Data files
`samplestats.csv` and `2024-2025.csv` are sample/season stat exports for importing in the browser. Not loaded by code.

## Conventions
- Tabs for indentation in `.vue`/`.js` (despite `.editorconfig` saying spaces) — match the surrounding file.
- Store mutations are `UPPER_SNAKE`, actions camelCase; components dispatch actions, never commit directly.
- **Styling:** Tailwind utilities in templates; no `<style>` blocks unless unavoidable.
  - Use the semantic colors (`bg-canvas`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-muted`, `accent`, `good`, `bad`, `warn`) — not raw palette colors or `dark:` variants. Light/dark follows the OS via the `prefers-color-scheme` block in `app.css`.
  - Reuse the shared classes in `app.css` (`page-title`, `page-subtitle`, `card`, `btn btn-primary|btn-ghost`, `label`, `help`, `field`, `chip`, `pill`, `nav-item`, `table-wrap` + `data-table`, `pin` for sticky table columns, `key-col`) before adding long utility strings.
  - Class names built in JS (e.g. `scoreClass()`, `playerClass()`) must be complete literal strings so Tailwind detects them.
  - Utilities beat component classes regardless of specificity; put a style in the component layer when something (e.g. row hover) needs to override it.
- README has a running "Maintenance update" log; append to it only if asked.
