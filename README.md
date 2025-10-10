# vue-fantasy-picker


## Key Features(some still in progress)
- Import a file
- Set important columns for the file
- Set how many top players in each category to use to find the average
- Change category average method(average, median, average of a median group?)
- Calculate each players variance from category average
- Highlight top players in each category and players who are in top X players in the most categories
- Working settings tools to modify configuration
- Player filter by position
- Show the strength summary of my team or taken players(other teams)
- Player searching by partial name
- Highlight the best player and worst in each column on ranking views
- Mark your team 
- Mark players unavailable
- Local storage

## TODO:
- Fantasy team config setup(for available position slots)
- Import list of taken players(name match)
- Simpler loading of files and evaluating so its smooth process and less tedious
- Improve the performance of evaluating
- Create alternate ranking method that gives double weight to players with an above average shooting percentage so we can try that out
- Better horizontal table scrolling?
- Maybe add vue-router for better url stuff

## Phase 1
- Geared towards nba head to head fantasy team that needs to win multiple categories each week

## Phase 2
- Ability to dynamically set the players name column, scoring stats columns and the non-scoring stats columns. This can be done by clicking little icon on column title and setting option.
- More color schemes!
- Ability to draft a dream team by generating loads of teams and figuring out the best one



Started with [VuePack](https://github.com/egoist/vuepack).

#### To start:

```bash
$ npm install
```
or
```bash 
$ yarn install
```

#### To develop:

```bash
$ npm run dev
```
or
```bash 
$ yarn run dev
```

#### To build for production:

```bash
$ npm run build
```
or
```bash
$ yarn run build
```

#### To lint you code:

```bash
$ npm run lint
```


---

### Maintenance notes
- Migrated the project to Vue 3 + Vite (no more Webpack 3).
  - Dev: `npm run dev` (Vite)
  - Build: `npm run build`
  - Preview production build: `npm run preview`
- Routing: upgraded to `vue-router@^4`.
- State: upgraded to `vuex@^4`, with `vuex-persist` continuing to persist to localStorage.
- Icons: replaced the `vue-awesome` dependency with a lightweight built-in Icon component (`client/components/Icon.vue`) to minimize dependencies.
- Config UI: replaced `vue-multiselect` with native `<select>` elements for compatibility with Vue 3 and to reduce bundle size.
- Aliases: Vite config adds path aliases (components, views, store). See `vite.config.js`.
- Styling: still using precompiled Bootswatch (Flatly) CSS via JS import.

After pulling changes, it's a good idea to refresh your install to clean out legacy artifacts:
- npm users: `rm -f package-lock.json && rm -rf node_modules && npm install`
- yarn users: `rm -f yarn.lock && rm -rf node_modules && yarn`
- pnpm users: `rm -f pnpm-lock.yaml && rm -rf node_modules && pnpm install`

Notes on SCSS usage:
- Local styles currently don’t use deprecated Sass functions like lighten() or abs(). If adding new SCSS, prefer `@use 'sass:color'` and `@use 'sass:math'` with `color.scale()/color.adjust()` and `math.abs()` respectively, and avoid `@import` in favor of `@use`/`@forward`.




---

Maintenance update (2025-10-09)
- Fixed Vite/PostCSS startup error: added PostCSS plugins to devDependencies (`postcss`, `autoprefixer`, and `postcss-nested`). The PostCSS config remains in package.json under the `postcss` key.
- Note on Vite CJS Node API deprecation: this project uses an ESM `vite.config.js`. If you see a log like "The CJS build of Vite's Node API is deprecated", it likely originates from external tooling that programmatically requires Vite. The app itself is already configured for ESM.

Maintenance update (2025-10-10)
- Fixed runtime error with SweetAlert2 CSS import under Vite by upgrading to `sweetalert2@^11` and switching to the ESM API.
  - Components now call `Swal.fire(...)` instead of the legacy `sweetAlert(...)`.
  - SweetAlert2 CSS is imported once globally in `client/app.js`.
  - Removed unused SweetAlert2 imports from components that didn’t use it.
- Icons: switched the internal Icon component to Font Awesome (free-solid) using `@fortawesome/vue-fontawesome`.
  - Installed `@fortawesome/fontawesome-svg-core` and reused the existing `@fortawesome/free-solid-svg-icons`.
  - Existing usages like `<icon name="binoculars"/>` remain the same; mapping now renders actual FA SVGs.
- Performance: made the app snappier without changing behavior.
  - Store: added Set-based getters and boolean helpers for watch/myTeam/taken to eliminate per-row Array.includes lookups.
  - Store: precompute best/worst scores for the currently filtered set; components now read from getters instead of recomputing.
  - Store: normalize numeric fields on import and compute per-game totals safely; avoids repeated parsing and NaNs.
  - UI: debounced search input (200ms) to reduce unnecessary recomputations while typing.
- New: Configurable category average pool.
  - In Configure -> General, choose how many players to use when computing the category baseline average: All (valid players), Top 100, Top 150, or Top 200.
  - The baseline now uses the top N players in that category (sorted correctly for positive/negative stats) after applying your minimum games/minutes filters.
  - Tip: click "Evaluate Players" again after changing this to recompute scores.
- After pulling changes, run a clean install to update the lockfile:
  - npm: `rm -rf node_modules package-lock.json && npm install`
  - pnpm: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
  - yarn: `rm -rf node_modules yarn.lock && yarn`
