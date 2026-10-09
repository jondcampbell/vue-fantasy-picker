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
- `pnpm test` — Vitest 5: `scoring.test.js` (scoring math), `persist.test.js` + `persist.store.test.js` (restore/migration/saving) `sources.test.js` + `update-stats.test.js` + `espn-ui.test.js` (ESPN/nbaapi parsing, linking, datasets; fixtures in `test/fixtures/` cut from real responses, network faked) and `ui.smoke.test.js` (mounts every screen with `samplestats.csv` in happy-dom; fails on any Vue warning). Tests never hit the network.
- `pnpm lint` — ESLint 10 flat config (`eslint.config.js`): JS recommended + `vue/flat/essential`, correctness only, no formatting rules

## Structure
- `index.html` → `client/app.js` (the real entry: creates app, installs the store plugin, global `<icon>`, imports SweetAlert CSS + `client/styles/app.css`)
- `client/views/Home.vue` — the whole UI shell: sticky header, sidebar nav + roster lists, and screen switching. Ranking category switching (pills + sortable headers) lives in `Scores.vue`
- `client/components/pages/` — screens: ImportData (the **Data** screen: Update stats, datasets, linking, CSV import), Players, Scores (rankings), WatchList, MyTeam, Config
- `client/components/partials/` — PlayerTable (raw-stats table used by Players/Watch List/My Team) + PlayerRow, ScoreRow, ListToggles (watch/team/taken buttons shared by both row types), PlayerFiltering, PlayerSummary, PlayerListScoring, RosterCard (My Team lineup), TableFooter (show more/all), ThemeToggle
- `client/components/mixins/rowLimit.js` — big tables render 150 rows at a time; the limit resets when filters/search/ranking category change
- `client/styles/app.css` — Tailwind entry: semantic color tokens, light/dark values, shared component classes
- `client/store/index.js` — Pinia store (`usePickerStore`), the app's singleton `useStore()` (applies persistence), and the default export plugin that installs Pinia and sets `$store`
- `client/store/scoring.js` — pure scoring math (baseline averages, category scores). Keep it store-free and covered by `test/unit/scoring.test.js`
- `client/store/roster.js` — pure roster-slot logic (slot types, eligibility, `assignRoster` matching). Covered by `test/unit/roster.test.js`
- `client/store/normalize.js` — pure row normalization (dedupe, name cleanup, numeric coercion, totals → per-game); copies rows so stored datasets are never mutated
- `client/store/registry.js` — links ESPN IDs to Basketball-Reference IDs (`linkPlayers`, name match + games-played tie-break, similarity suggestions)
- `client/sources/` — online stat sources, all converted to the Basketball-Reference totals layout (`layout.js`, 33 columns + `ESPN ID`): `espn.js` (ESPN fantasy player pool; **must send the `x-fantasy-filter` header** or ESPN returns only 50 players) and `nbaapi.js` (nbaapi.com, Basketball-Reference totals, 50 rows/page). Both are unofficial/free with no key and allow browser CORS from localhost. `espnLeague.js` parses the private league (lineup slots, scoring categories → column indexes, rosters, your team via SWID).
- `server/espnLeague.js` — Vite plugin (dev + preview) serving `GET /espn-league?season=YYYY`: adds `espn_s2`/`SWID` cookies from `.env.local` (`ESPN_LEAGUE_ID`, `ESPN_S2`, `ESPN_SWID`; git-ignored, loaded with `loadEnv(..., 'ESPN_')`, never sent to the browser), fixed views `mTeam,mRoster,mSettings`, 60 s cache, friendly errors, returns the SWID in `x-espn-swid`. League sync only works under `pnpm dev`/`pnpm preview`.
- **Be gentle with ESPN's API** (user request): no loops or repeated probing; save one response to the scratchpad and work from it; tests always fake the network.
- Vite aliases: `@` → `client`, plus `components`, `views`, `store`

## How the app works
- **Navigation is by `state.config.screen` number, not routes:** 1 Data, 2 Players, 3 Rankings, 4 Configure, 5 Watch List, 6 My Team. Change via `$store.changeScreen(n)`.
- **CSV rows are arrays, columns are referenced by index.** Config holds `id_column` (CSV rank; only used to de-duplicate and tell namesakes apart when there's no ID column), `key_column` (stable player ID column, auto-detected on import), `name_column`, `pos_column`, `games_column`, `minutes_column`, `key_columns` (scoring categories, averaged into the total), `ranking_only_columns` (scored and rankable, not in the total; default BLK, TOV), `negative_columns` (lower is better, e.g. turnovers), `yearly_total_columns` (converted to per-game on import). Defaults in the store match the current CSV export format.
- **Datasets**: `datasets[id]` hold raw season-total rows + columns per source/split (`espn-actual-2027`, `espn-projection-2027`, `espn-last30-2027`, `espn-actual-2026`, `bbref-actual-2026`, `csv`). `useDataset(id)` normalizes the active one into `players`/`columns` and re-scores; `changeConfigSetting` re-loads it so column settings apply without re-importing. `updateStats()` fetches ESPN + nbaapi (this season, last, and the one before for linking), links IDs, rebuilds datasets, and picks this season's actuals or else ESPN's projection. The newest `projection` dataset is also scored into `projection_totals` (Rankings "Proj" column). `espn_players` holds ESPN eligibility/injury/draft rank, exposed by key via the `espnInfo` getter.
- **Import** (`importPlayers`): stores the CSV as the `csv` dataset, then `useDataset`: first row becomes `state.columns`; detects `key_column`; dedupes players by identity (first row wins, i.e. the combined row for traded players); cleans names (strips `\…` suffix), coerces numerics, converts totals to per-game; reconciles lists; re-scores. Lists are **not** cleared.
- **Evaluate** (`evaluatePlayers`): computes a baseline per key category (`categoryAverage()` in `scoring.js` — respects `average_mode`, `average_pool_size`, min games/minutes; the `top_players` setting is currently unused), then scores each qualifying player into `scores`. Each category score is `value / baseline` (1.0 = average); lower-is-better columns use `2 − value / baseline` so higher is always better. `total` is the mean of the category scores; `aboveAverage` counts categories scored above 1.0. `average_mode`: 1 = mean, 2 = median. Runs automatically after import, after every `changeConfigSetting`, and on app load (there is no Evaluate button).
- `players` and `scores` are `markRaw` (no deep reactivity, big render win): never mutate rows in place — always assign a new array.
- **Roster slots** (`config.roster_slots`, default ESPN: PG, SG, SF, PF, C, G, F, UTIL×3, Bench×4, IR): `roster` getter seats `my_team` — best scores start via max matching, rest on Bench, `ir_players` in IR, extras in overflow. Eligibility = CSV position + `position_overrides[key]`. G = PG/SG, F = SF/PF, UTIL/Bench = anyone.
- **Player identity** (`client/store/identity.js`, tests in `identity.test.js` and `reimport.test.js`): lists, `ir_players` and `position_overrides` hold string **player keys**, never row indexes or ranks. Key = Basketball-Reference ID (`jokicni01`) from the `Player-additional` column; ESPN rows (`ESPN ID` column) use the linked Basketball-Reference ID from `espn_links`, or `espn:<id>` until linked (list entries move to the Basketball-Reference ID once linked); without either, `n:` + normalized name (accents/case/punctuation/Jr. ignored), with `#team` appended for namesakes in the same file. Keys are derived (`rowKeys` / `keyRows` getters), not stored on rows. On import/load, `reconcileLists()` keeps found keys, moves an entry to a new key only on a unique name match (never for a vanished ID when the new data has IDs), and leaves ambiguous/missing entries for `listIssues`, shown by `ListIssues.vue` on Import, My Team and Watch List. `list_names` remembers display names for list entries.
- Player lists (`my_team`, `taken_players`, `watch_list`) store player keys. Use the Set-based getters (`isWatched`, `isOnTeam`, `isTaken`, `filteredScores`, `bestScores`, `worstScores`) rather than recomputing in components.
- **League sync** (`syncLeague`): one request via the proxy. Sets `roster_slots`, `key_columns`/`negative_columns` from league scoring (removing them from `ranking_only_columns`); after the draft replaces `my_team`/`taken_players`/`ir_players` with the league rosters (watch list and position overrides kept). Before the draft (empty rosters) lists are left alone. `league` stores the last sync summary. Rostered players without stats in the active dataset still appear on the roster (via `espnInfo`) and are not flagged in `listIssues`.
- **Persistence:** on load, saved top-level keys and `config` keys replace defaults wholesale (arrays are never merged by index); keys missing from saved state fall back to defaults. Saves happen via `$subscribe`, batched to one write per tick. When changing a default that saved state already has (e.g. adding to `yearly_total_columns`), add a migration in `restoreState()` and a test in `test/unit/persist.test.js` — users' saved values otherwise win.

## Data files
`samplestats.csv` and `2024-2025.csv` are sample/season stat exports for importing in the browser; `samplestats.csv` is used by the smoke test. Saved state with ESPN + Basketball-Reference datasets is ~500 KB of localStorage.

## Conventions
- Tabs for indentation in `.vue`/`.js` (despite `.editorconfig` saying spaces) — match the surrounding file.
- Components change state through store actions (`$store.addToList({ list, player_id })`), not by assigning store state directly.
- **Styling:** Tailwind utilities in templates; no `<style>` blocks unless unavoidable.
  - Use the semantic colors (`bg-canvas`, `bg-surface`, `bg-surface-2`, `border-line`, `text-fg`, `text-muted`, `accent`, `good`, `bad`, `warn`) — not raw palette colors or `dark:` variants. Tokens use `light-dark()`; the OS decides unless `ThemeToggle` sets `data-theme="light|dark"` on `<html>` (saved in localStorage key `theme`, applied pre-paint by an inline script in `index.html`).
  - Reuse the shared classes in `app.css` (`page-title`, `page-subtitle`, `card`, `btn btn-primary|btn-ghost`, `label`, `help`, `field`, `chip`, `pill`, `nav-item`, `table-wrap` + `data-table`, `pin` for sticky table columns, `key-col`) before adding long utility strings.
  - Class names built in JS (e.g. `scoreClass()` in ScoreRow, `columnClasses` in PlayerTable) must be complete literal strings so Tailwind detects them.
  - Utilities beat component classes regardless of specificity; put a style in the component layer when something (e.g. row hover) needs to override it.
- README describes features, setup and commands for a human reader; keep it current when features change, but no changelog/maintenance notes.
