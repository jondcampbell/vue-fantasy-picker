import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { API_COLUMNS, BBREF_COLUMNS, buildRow, currentSeason, seasonLabel } from '../../client/sources/layout';
import { parseEspnPlayers, espnDatasets, fetchEspnPlayers, espnPlayersUrl } from '../../client/sources/espn';
import { parseNbaapiRows, nbaapiDataset, fetchNbaapiSeason } from '../../client/sources/nbaapi';
import { linkPlayers, nameSimilarity } from '../../client/store/registry';

const fixture = name => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures', name), 'utf8'));
const espnJson = fixture('espn-players-2027.json');
const nbaapiJson = fixture('nbaapi-playertotals-2026.json');
const col = name => API_COLUMNS.indexOf(name);

describe('layout', () => {
	it('matches the Basketball-Reference CSV header plus an ESPN ID column', () => {
		expect(BBREF_COLUMNS.length).toBe(33);
		expect(API_COLUMNS[32]).toBe('Player-additional');
		expect(API_COLUMNS[33]).toBe('ESPN ID');
	});

	it('builds a totals row with derived percentages', () => {
		const row = buildRow(1, { name: 'A', team: 'BOS', pos: 'PG', bbrefId: 'aaa01', espnId: '9' },
			{ gp: 10, min: 300, fgm: 50, fga: 100, tpm: 20, tpa: 50, ftm: 9, fta: 10, trb: 40, ast: 30, stl: 10, blk: 5, tov: 12, pts: 129 });
		expect(row.length).toBe(34);
		expect(row[col('FG%')]).toBe(0.5);
		expect(row[col('2P')]).toBe(30);
		expect(row[col('eFG%')]).toBe(0.6);
		expect(row[col('FT%')]).toBe(0.9);
		expect(row[col('GS')]).toBe(0);
		expect(row[col('Player-additional')]).toBe('aaa01');
		expect(row[col('ESPN ID')]).toBe('9');
	});

	it('works out the season from the date', () => {
		expect(currentSeason(new Date(2026, 9, 9))).toBe(2027);
		expect(currentSeason(new Date(2027, 2, 1))).toBe(2027);
		expect(currentSeason(new Date(2027, 7, 1))).toBe(2027);
		expect(seasonLabel(2027)).toBe('2026-27');
	});
});

describe('ESPN source', () => {
	const players = parseEspnPlayers(espnJson);

	it('parses players with eligibility, rank and splits', () => {
		const jokic = players.find(p => p.name === 'Nikola Jokic');
		expect(jokic).toMatchObject({ espnId: expect.any(String), team: 'DEN', pos: 'C', eligible: ['C'], espnRank: 1 });
		expect(jokic.splits['002026']).toMatchObject({ gp: 65, min: 2265, pts: 1799, blk: 53, tov: 243, tpm: 112 });
		const lebron = players.find(p => p.name === 'LeBron James');
		expect(lebron.eligible).toEqual(['SF', 'PF']);
	});

	it('builds a dataset per split that has games, skipping empty ones', () => {
		const datasets = espnDatasets(players, 2027);
		expect(datasets.map(d => d.id)).toEqual(['espn-projection-2027', 'espn-actual-2026']);
		const previous = datasets.find(d => d.id === 'espn-actual-2026');
		expect(previous.label).toBe('2025-26 Actual');
		const jokicRow = previous.rows.find(row => row[1] === 'Nikola Jokic');
		expect(jokicRow[col('G')]).toBe(65);
		expect(jokicRow[col('PTS')]).toBe(1799);
		expect(jokicRow[col('Player-additional')]).toBe('');
		expect(jokicRow[col('ESPN ID')]).toBe(players.find(p => p.name === 'Nikola Jokic').espnId);
		// Ranked by points
		expect(previous.rows.map(row => row[0])).toEqual(previous.rows.map((row, i) => i + 1));
	});

	it('fetches the season player pool', async () => {
		const calls = [];
		const fakeFetch = async (url, options) => { calls.push({ url, filter: options.headers['x-fantasy-filter'] }); return { ok: true, json: async () => espnJson }; };
		expect(await fetchEspnPlayers(2027, fakeFetch)).toBe(espnJson);
		// The filter header is required: without it ESPN only returns 50 players
		expect(calls).toEqual([{ url: espnPlayersUrl(2027), filter: '{"filterActive":{"value":true}}' }]);
		await expect(fetchEspnPlayers(2027, async () => ({ ok: false, status: 503 }))).rejects.toThrow('ESPN returned 503');
	});
});

describe('nbaapi source', () => {
	const players = parseNbaapiRows(nbaapiJson);

	it('keeps one regular-season row per player, preferring the combined traded row', () => {
		expect(players.length).toBe(6);
		const harden = players.find(p => p.bbrefId === 'hardeja01');
		expect(harden.team).toBe('2TM');
		const jokic = players.find(p => p.bbrefId === 'jokicni01');
		expect(jokic.totals).toMatchObject({ gp: 65, min: 2265, pts: 1799, blk: 53, tov: 243 });
	});

	it('builds a Basketball-Reference dataset with linked ESPN IDs', () => {
		const dataset = nbaapiDataset(players, 2026, id => (id === 'jokicni01' ? '3112335' : ''));
		expect(dataset.id).toBe('bbref-actual-2026');
		const row = dataset.rows.find(r => r[col('Player-additional')] === 'jokicni01');
		expect(row[col('ESPN ID')]).toBe('3112335');
		expect(row[col('Player')]).toBe('Nikola Jokić');
	});

	it('pages through every result', async () => {
		const pages = { 1: [nbaapiJson[0]], 2: [nbaapiJson[1]] };
		const progress = [];
		const fakeFetch = async (url) => {
			const page = Number(new URL(url).searchParams.get('page'));
			return { ok: true, json: async () => ({ data: pages[page], pagination: { pages: 2 } }) };
		};
		const rows = await fetchNbaapiSeason(2026, fakeFetch, (page, total) => progress.push(`${page}/${total}`));
		expect(rows.length).toBe(2);
		expect(progress).toEqual(['1/2', '2/2']);
	});
});

describe('linking ESPN and Basketball-Reference players', () => {
	const espn = parseEspnPlayers(espnJson).map(p => ({ espnId: p.espnId, name: p.name, team: p.team, gp: p.splits['002026']?.gp ?? 0 }));
	const bbref = parseNbaapiRows(nbaapiJson).map(p => ({ bbrefId: p.bbrefId, name: p.name, team: p.team, gp: p.totals.gp }));

	it('links by name, ignoring accents and suffixes', () => {
		const { links, unlinked } = linkPlayers(espn, bbref);
		const idOf = name => espn.find(p => p.name === name).espnId;
		expect(links[idOf('Nikola Jokic')]).toBe('jokicni01');
		expect(links[idOf('LeBron James')]).toBe('jamesle01');
		expect(links[idOf('Russell Westbrook')]).toBe('westbru01');
		// "Ronald Holland II" vs "Ron Holland": not guessed, but suggested
		expect(unlinked.map(u => u.name)).toEqual(['Ronald Holland II']);
		expect(unlinked[0].candidates[0].bbrefId).toBe('hollaro01');
	});

	it('keeps existing (manual) links and does not reuse their bbref IDs', () => {
		const holland = espn.find(p => p.name.startsWith('Ronald')).espnId;
		const { links, unlinked } = linkPlayers(espn, bbref, { [holland]: 'hollaro01' });
		expect(links[holland]).toBe('hollaro01');
		expect(unlinked).toEqual([]);
	});

	it('breaks name ties with games played, otherwise leaves them for you', () => {
		const espnTwins = [{ espnId: '1', name: 'John Smith', gp: 40 }];
		const bbrefTwins = [{ bbrefId: 'smithjo01', name: 'John Smith', gp: 12 }, { bbrefId: 'smithjo02', name: 'John Smith', gp: 40 }];
		expect(linkPlayers(espnTwins, bbrefTwins).links).toEqual({ 1: 'smithjo02' });
		const tied = linkPlayers([{ espnId: '1', name: 'John Smith', gp: 5 }], bbrefTwins);
		expect(tied.links).toEqual({});
		expect(tied.unlinked[0].reason).toBe('ambiguous');
		expect(tied.unlinked[0].candidates.map(c => c.bbrefId).sort()).toEqual(['smithjo01', 'smithjo02']);
	});

	it('scores name similarity', () => {
		expect(nameSimilarity('Ronald Holland II', 'Ron Holland')).toBeGreaterThan(0.7);
		expect(nameSimilarity('Nikola Jokić', 'Nikola Jokic')).toBe(1);
		expect(nameSimilarity('Nikola Jokic', 'LeBron James')).toBeLessThan(0.3);
	});
});
