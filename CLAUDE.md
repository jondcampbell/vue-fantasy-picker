# vue-fantasy-picker

Personal tool for evaluating fantasy basketball (NBA head-to-head, category league) player stats from an imported CSV.

**Local only.** Never deployed or hosted anywhere. No backend, no API, no auth — everything runs in the browser and persists to localStorage. Don't add deployment, PWA, SEO or server concerns.

## Stack
- **Node 24** (`.nvmrc`; run `nvm use` first — the Homebrew default Node 21 is too old for Vite 8 / ESLint 10)
- Vue 3 (Options API, `.vue` SFCs) + Vite 8; package is ESM (`"type": "module"`)
- Pinia 4 options store, exposed to components as `this.$store` / `$store`; whole store persisted to localStorage (key `vuex`, kept from the old Vuex setup) by `client/store/persist.js`
- No router: `App.vue` renders `Home.vue` directly
- Tailwind CSS v4 via `@tailwindcss/vite` + `@tailwindcss/forms` (no `tailwind.config.js`; config lives in CSS). No Sass, no PostCSS config.
- papaparse (CSV import), sweetalert2 (`Swal.fire`), Font Awesome via `client/components/Icon.vue`

## Commands
Package manager is **pnpm**. In Claude's Bash shell, prefix commands with `source ~/.nvm/nvm.sh && nvm use &&`.

- `pnpm dev` — Vite dev server at http://localhost:5173
- `pnpm build` — production build to `dist/` (use this to verify changes compile)
- `pnpm preview` — serve the build
- `pnpm test` — Vitest 5: `scoring.test.js` (scoring math), `persist.test.js` + `persist.store.test.js` (restore/migration/saving) and `ui.smoke.test.js` (mounts every screen with `samplestats.csv` in happy-dom; fails on any Vue warning)
- `pnpm lint` — ESLint 10 flat config (`eslint.config.js`): JS recommended + `vue/flat/essential`, correctness only, no formatting rules

## Structure
- `index.html` → `client/app.js` (the real entry: creates app, installs the store plugin, global `<icon>`, imports SweetAlert CSS + `client/styles/app.css`)
- `client/views/Home.vue` — the whole UI shell: sticky header, sidebar nav + roster lists, and screen switching. Ranking category switching (pills + sortable headers) lives in `Scores.vue`
- `client/components/pages/` — screens: ImportData, Players, Scores (rankings), WatchList, MyTeam, Config
- `client/components/partials/` — PlayerTable (raw-stats table used by Players/Watch List/My Team) + PlayerRow, ScoreRow, ListToggles (watch/team/taken buttons shared by both row types), PlayerFiltering, PlayerSummary, PlayerListScoring, RosterCard (My Team lineup), TableFooter (show more/all), ThemeToggle
- `client/components/mixins/rowLimit.js` — big tables render 150 rows at a time; the limit resets when filters/search/ranking category change
- `client/styles/app.css` — Tailwind entry: semantic color tokens, light/dark values, shared component classes
- `client/store/index.js` — Pinia store (`usePickerStore`), the app's singleton `useStore()` (applies persistence), and the default export plugin that installs Pinia and sets `$store`
- `client/store/scoring.js` — pure scoring math (baseline averages, category scores). Keep it store-free and covered by `test/unit/scoring.test.js`
- `client/store/roster.js` — pure roster-slot logic (slot types, eligibility, `assignRoster` matching). Covered by `test/unit/roster.test.js`
- Vite aliases: `@` → `client`, plus `components`, `views`, `store`

## How the app works
- **Navigation is by `state.config.screen` number, not routes:** 1 Import, 2 Players, 3 Rankings, 4 Configure, 5 Watch List, 6 My Team. Change via `$store.changeScreen(n)`.
- **CSV rows are arrays, columns are referenced by index.** Config holds `id_column`, `name_column`, `pos_column`, `games_column`, `minutes_column`, `key_columns` (scoring categories, averaged into the total), `ranking_only_columns` (scored and rankable, not in the total; default BLK, TOV), `negative_columns` (lower is better, e.g. turnovers), `yearly_total_columns` (converted to per-game on import). Defaults in the store match the current CSV export format.
- **Import** (`importPlayers`): first row becomes `state.columns`; resets my team/taken/watch lists; dedupes players by id (first row wins), cleans names (strips `\…` suffix), coerces numerics, converts totals to per-game.
- **Evaluate** (`evaluatePlayers`): computes a baseline per key category (`categoryAverage()` in `scoring.js` — respects `average_mode`, `average_pool_size`, min games/minutes; the `top_players` setting is currently unused), then scores each qualifying player into `scores`. Each category score is `value / baseline` (1.0 = average); lower-is-better columns use `2 − value / baseline` so higher is always better. `total` is the mean of the category scores; `aboveAverage` counts categories scored above 1.0. `average_mode`: 1 = mean, 2 = median. Runs automatically after import, after every `changeConfigSetting`, and on app load (there is no Evaluate button).
- `players` and `scores` are `markRaw` (no deep reactivity, big render win): never mutate rows in place — always assign a new array.
- **Roster slots** (`config.roster_slots`, default ESPN: PG, SG, SF, PF, C, G, F, UTIL×3, Bench×4, IR): `roster` getter seats `my_team` — best scores start via max matching, rest on Bench, `ir_players` in IR, extras in overflow. Eligibility = CSV position + `position_overrides[id]`. G = PG/SG, F = SF/PF, UTIL/Bench = anyone. Overrides and IR reset on import with the other lists.
- Player lists (`my_team`, `taken_players`, `watch_list`) store integer player ids. Use the Set-based getters (`isWatched`, `isOnTeam`, `isTaken`, `filteredScores`, `bestScores`, `worstScores`) rather than recomputing in components.
- **Persistence:** on load, saved top-level keys and `config` keys replace defaults wholesale (arrays are never merged by index); keys missing from saved state fall back to defaults. Saves happen via `$subscribe`, batched to one write per tick. When changing a default that saved state already has (e.g. adding to `yearly_total_columns`), add a migration in `restoreState()` and a test in `test/unit/persist.test.js` — users' saved values otherwise win.

## Data files
`samplestats.csv` and `2024-2025.csv` are sample/season stat exports for importing in the browser. Not loaded by code.

## Conventions
- Tabs for indentation in `.vue`/`.js` (despite `.editorconfig` saying spaces) — match the surrounding file.
- Components change state through store actions (`$store.addToList({ list, player_id })`), not by assigning store state directly.
- **Styling:** Tailwind utilities in templates; no `<style>` blocks unless unavoidable.
  - Use the semantic colors (`bg-canvas`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-muted`, `accent`, `good`, `bad`, `warn`) — not raw palette colors or `dark:` variants. Tokens use `light-dark()`; the OS decides unless `ThemeToggle` sets `data-theme="light|dark"` on `<html>` (saved in localStorage key `theme`, applied pre-paint by an inline script in `index.html`).
  - Reuse the shared classes in `app.css` (`page-title`, `page-subtitle`, `card`, `btn btn-primary|btn-ghost`, `label`, `help`, `field`, `chip`, `pill`, `nav-item`, `table-wrap` + `data-table`, `pin` for sticky table columns, `key-col`) before adding long utility strings.
  - Class names built in JS (e.g. `scoreClass()` in ScoreRow, `columnClasses` in PlayerTable) must be complete literal strings so Tailwind detects them.
  - Utilities beat component classes regardless of specificity; put a style in the component layer when something (e.g. row hover) needs to override it.
- README has a running "Maintenance update" log; append to it only if asked.
