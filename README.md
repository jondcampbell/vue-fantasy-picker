# Fantasy Stats Man (vue-fantasy-picker)

A local tool for evaluating NBA players for a head-to-head **category** fantasy league. Import a season stats CSV, and it scores every player against a baseline in each category, ranks them, and helps you track your roster, the players other teams have taken, and a watch list.

Runs entirely in the browser on your machine. There's no backend, and everything is saved to the browser's localStorage.

## Features

- **Import** a Basketball-Reference season totals CSV (drag and drop or browse). Players listed on several rows after a trade are de-duplicated, and season totals are converted to per-game.
- **Automatic scoring** after every import and settings change. Each category score is the player's value divided by the category baseline (1.00 = average). For lower-is-better stats like turnovers, a lower value means a higher score.
- **Configurable baseline**: mean or median, using all qualifying players or only the top 100/150/200, with minimum games and minutes per game.
- **Rankings**: rank by the overall score or any category, either with the "Rank by" pills or by clicking a column header. Best and worst values in each column are highlighted.
- **Ranking-only columns** (BLK and TOV by default) can be ranked without counting toward the overall score.
- **Lists**: mark players as on your team, taken by another team, or watched, then filter any table by availability, position or name.
- **Roster slots** (ESPN layout by default: PG, SG, SF, PF, C, G, F, UTIL ×3, Bench ×4, IR). My Team fills the lineup automatically, best scores first. You can add extra position eligibility per player, move players to IR, and see open slots at a glance.
- **Column mapping** in Configure: choose the name, position, games, minutes, scoring, lower-is-better, ranking-only and season-total columns.
- **Light/dark theme** that follows your system, or can be set by hand.

## Getting started

Requires **Node 24** (pinned in `.nvmrc`) and **pnpm**.

```bash
nvm use
pnpm install
pnpm dev        # http://localhost:5173
```

### Getting stats

On Basketball-Reference, open the season's **Player Totals** table (e.g. `leagues/NBA_2025_totals.html`), choose *Share & Export → Get table as CSV*, save it as a `.csv` file, and import it on the Import screen. The default column settings match that export. If a different export lays out its columns differently, adjust them in Configure.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server with hot reload |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Serve the production build |
| `pnpm test` | Vitest unit and UI smoke tests |
| `pnpm lint` | ESLint |

## Stack

Vue 3 (Options API) · Pinia · Vite · Tailwind CSS v4 · Vitest + happy-dom · ESLint · papaparse · SweetAlert2 · Font Awesome

## Ideas

- Keep your team, taken and watch lists when re-importing updated stats
- Filter rankings to players who fit your open roster slots
- Mark taken players by pasting rosters from your league site
- Compare your team's category strengths against the league or another team
- Punt-category presets
- An alternate ranking that weights good shooting percentages more heavily

Originally started from [VuePack](https://github.com/egoist/vuepack).
