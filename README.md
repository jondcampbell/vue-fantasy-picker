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
- Replaced deprecated node-sass with dart-sass (the `sass` package) and updated sass-loader to a version compatible with Webpack 3.
- Removed Bootstrap SCSS import to avoid Sass @import deprecation warnings. We now rely on the precompiled Bootswatch CSS theme only.
- Updated selected dependencies for stability:
  - papaparse → ^5.4.1
  - vue-router → ^3.5.4 (Vue 2 compatible)
- After pulling these changes, delete existing lockfile and reinstall to avoid native binding leftovers from node-sass and to refresh dependency tree:
  - npm users: `rm -f package-lock.json && rm -rf node_modules && npm install`
  - yarn users: `rm -f yarn.lock && rm -rf node_modules && yarn`
- If you still see errors related to node-sass or Sass warnings from third-party packages, ensure no global caches are interfering and that your Node version is supported by the installed `sass` release.
- Notes on SCSS usage:
  - Local styles currently don’t use deprecated Sass functions like lighten() or abs(). If adding new SCSS, prefer `@use 'sass:color'` and `@use 'sass:math'` with `color.scale()/color.adjust()` and `math.abs()` respectively, and avoid `@import` in favor of `@use`/`@forward`.


