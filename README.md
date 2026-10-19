# Fantasy Stats Man (vue-fantasy-picker)

A local tool for evaluating NBA players for a head-to-head **category** fantasy league. Import a season stats CSV, and it scores every player against a baseline in each category, ranks them, and helps you track your roster, the players other teams have taken, and a watch list.

Runs entirely in the browser on your machine. There's no backend, and everything is saved to the browser's localStorage.

## Features

- **Online stats** with one click (no account or API key): ESPN's season stats, ESPN's projections, last-30-day stats, positions, injuries and draft ranks, plus Basketball-Reference season stats via nbaapi.com. Each becomes a dataset you can switch between, and every player keeps both their ESPN and Basketball-Reference IDs.
- **Our own rankings** from any dataset. Rankings also shows a **Proj** column (our score from ESPN's projected stats) and ESPN's draft rank for reference.
- **CSV import** of a Basketball-Reference season totals export as an alternative. Players listed on several rows after a trade are de-duplicated, and season totals are converted to per-game.
- **Automatic scoring** after every import and settings change. Each category score is the player's value divided by the category baseline (1.00 = average). For lower-is-better stats like turnovers, a lower value means a higher score. FG%, FT% and 3P% are weighted by attempts (on by default, in Configure): the score is the player's extra makes over an average shooter on the same attempts, so 90% on 8 free throws a game counts far more than 90% on 1, and a high-volume poor shooter scores low. Hover a percentage score on Rankings to see the shooting line behind it.
- **Configurable baseline**: mean or median, using all qualifying players or only the top 100/150/200, with minimum games and minutes per game.
- **Rankings**: rank by the overall score or any category, either with the "Rank by" pills or by clicking a column header. Best and worst values in each column are highlighted.
- **Ranking-only columns** (BLK and TOV by default) can be ranked without counting toward the overall score.
- **Punt** any category with one click above the Rankings table: it leaves the overall score but stays rankable. Punts are separate from ranking-only columns, so **Clear punts** puts you back exactly where you were.
- **Lists**: mark players as on your team, taken by another team, or watched, then filter any table by availability, position or name. Positions include ESPN's eligibility, so a PG/SG shows up under both. Lists carry over when you re-import updated stats: players are matched by their Basketball-Reference ID, or by name if a file has no IDs. Anyone who can't be matched, or whose name is shared by several players, is flagged for you to resolve.
- **ESPN league sync** for a private league: your team, every other team's players, IR, lineup slots and scoring categories in one click. Login cookies stay in a local `.env.local` file.
- **Roster slots** (ESPN layout by default: PG, SG, SF, PF, C, G, F, UTIL ×3, Bench ×4, IR). My Team fills the lineup automatically, best scores first. You can add extra position eligibility per player, move players to IR, and see open slots at a glance. On Rankings and Players, **Fits my open slots** shows only players who would start in one of them, counting lineup reshuffles (with C open and your PF/C playing PF, a PF fits).
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

Open the **Data** screen and click **Update stats**. It downloads everything in a few seconds and stores it locally. Run it again whenever you want fresh numbers. A few players ESPN and Basketball-Reference name differently (e.g. "Ronald Holland II" vs "Ron Holland") are listed for you to link once.

To use a CSV instead, open the season's **Player Totals** table on Basketball-Reference (e.g. `leagues/NBA_2025_totals.html`), choose *Share & Export → Get table as CSV*, save it as a `.csv` file, and import it on the Data screen.

### Syncing your ESPN league

1. Create `.env.local` in the project folder (it's git-ignored):
   ```
   ESPN_LEAGUE_ID=12345
   ESPN_S2=<espn_s2 cookie>
   ESPN_SWID={<SWID cookie, with the curly braces>}
   ```
   Find the cookies while logged in at fantasy.espn.com: DevTools → Application → Cookies → `https://fantasy.espn.com`.
2. Restart `pnpm dev`, open **Data**, and click **Sync league**.

Before your draft, only lineup slots and scoring categories sync; rosters sync as soon as any team has players. If ESPN rejects the cookies later, copy fresh values into `.env.local`.

### State snapshot

While `pnpm dev` or `pnpm preview` is running, the app keeps `.local/state.json` (git-ignored) up to date with your team, taken players, watch list and every league team's roster from the last sync, with player names. It's for reading your lists outside the browser; the app itself still saves to localStorage.

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

- Mark taken players by pasting rosters from your league site
- Compare your team's category strengths against the league or another team

Originally started from [VuePack](https://github.com/egoist/vuepack).
