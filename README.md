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
- Player searching by partial name
- Mark your team 
- Mark players unavailable

## TODO:
- Compare players head to head and show who is the best across the categories
- Strength of team scoring
- Team config setup(for available slots)
- Change my positions count code to not be hardcoded to basketball
- Import list of taken players(name match)

- Local Datebase storage of state 
- Simpler loading of files and evaulating so its smooth process and less tedious
- Improve the performance of evaluating
- Create alternate ranking method that gives double weight to players with an above average shooting percentage so we can try that out
- Better horizontal table scrolling?
- Maybe add vue-router for better url stuff

## Phase 1
- Geared towards nba head to head fantasy team that needs to win multiple categories each week

## Phase 2
- Ability to dynamically set the players name column, scoring stats columns and the non-scoring stats columns. This can be done by clicking little icon on column title and setting option.
- More color schemes!
- Ability to work for more sports and fantasy modes 
- Ability to draft a dream team by generating loads of teams and figuring out the best one
- Team configuration of positions



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


