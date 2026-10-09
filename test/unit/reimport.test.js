// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { usePickerStore } from '../../client/store';
import ListIssues from '../../client/components/partials/ListIssues.vue';

// Rows in the Basketball-Reference totals layout the default config expects (33 columns, ID last)
const row = (rank, name, team, id) => [rank, name, 30, team, 'PG', 60, 60, 1800, 0, 0, 0.45, 120, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 300, 240, 60, 30, 120, 120, 1200, 0, '', id];
const header = row('Rk', 'Player', 'Team', 'Player-additional');
const withIds = (...rows) => [header, ...rows];
const withoutIds = (...rows) => [header.slice(0, -1), ...rows.map(r => r.slice(0, -1))];

const freshStore = () => usePickerStore(createPinia());
const issuesCard = (store) => mount(ListIssues, { global: { config: { globalProperties: { $store: store } } } });

describe('re-importing updated stats', () => {
	let store;
	beforeEach(() => {
		store = freshStore();
	});

	it('keeps lists, overrides and IR when ranks change', () => {
		store.importPlayers(withIds(row(1, 'Nikola Jokić', 'DEN', 'jokicni01'), row(2, 'Jaren Jackson Jr.', 'MEM', 'jacksja02')));
		store.addToList({ list: 'my_team', key: 'jokicni01' });
		store.addToList({ list: 'watch_list', key: 'jacksja02' });
		store.togglePositionOverride({ key: 'jokicni01', position: 'PF' });
		store.toggleIr('jokicni01');

		// New export: different ranks and order, same players
		const result = store.importPlayers(withIds(row(1, 'Jaren Jackson Jr.', 'MEM', 'jacksja02'), row(7, 'Nikola Jokić', 'DEN', 'jokicni01')));
		expect(result).toEqual({ ambiguous: 0, missing: 0 });
		expect(store.my_team).toEqual(['jokicni01']);
		expect(store.watch_list).toEqual(['jacksja02']);
		expect(store.position_overrides).toEqual({ jokicni01: ['PF'] });
		expect(store.ir_players).toEqual(['jokicni01']);
		expect(store.myPlayers.map(p => p[1])).toEqual(['Nikola Jokić']);
	});

	it('de-duplicates traded players by ID, keeping the combined row', () => {
		store.importPlayers(withIds(row(5, 'Zach LaVine', '2TM', 'lavinza01'), row(5, 'Zach LaVine', 'CHI', 'lavinza01'), row(5, 'Zach LaVine', 'SAC', 'lavinza01')));
		expect(store.players.length).toBe(1);
		expect(store.players[0][3]).toBe('2TM');
	});

	it('flags players who are gone and lets you remove them', async () => {
		store.importPlayers(withIds(row(1, 'Nikola Jokić', 'DEN', 'jokicni01'), row(2, 'Retired Guy', 'BOS', 'retirgu01')));
		store.addToList({ list: 'taken_players', key: 'retirgu01' });
		store.addToList({ list: 'my_team', key: 'jokicni01' });

		const result = store.importPlayers(withIds(row(1, 'Nikola Jokić', 'DEN', 'jokicni01')));
		expect(result).toEqual({ ambiguous: 0, missing: 1 });

		const card = issuesCard(store);
		expect(card.text()).toContain('Retired Guy');
		expect(card.text()).toContain('Not in the current data');
		expect(card.text()).toContain('Taken');
		await card.findAll('button').find(b => b.text() === 'Remove').trigger('click');
		expect(store.taken_players).toEqual([]);
		expect(store.my_team).toEqual(['jokicni01']);
		expect(store.listIssues).toEqual([]);
	});

	it('asks which player is meant when an ID-less file has namesakes', async () => {
		store.importPlayers(withIds(row(1, 'John Smith', 'BOS', 'smithjo01')));
		store.addToList({ list: 'watch_list', key: 'smithjo01' });

		// A file without IDs and two John Smiths: never guess
		const result = store.importPlayers(withoutIds(row(1, 'John Smith', 'BOS'), row(2, 'John Smith', 'NYK'), row(3, 'Nikola Jokić', 'DEN')));
		expect(store.config.key_column).toBe(null);
		expect(result).toEqual({ ambiguous: 1, missing: 0 });

		const card = issuesCard(store);
		expect(card.text()).toContain('Several players have this name');
		const choices = card.findAll('button').filter(b => b.text().startsWith('John Smith'));
		expect(choices.map(b => b.text())).toEqual(['John Smith BOS · PG · 60 GP', 'John Smith NYK · PG · 60 GP']);
		await choices[0].trigger('click');
		expect(store.watch_list).toEqual(['n:john smith#bos']);
		expect(store.isWatched('n:john smith#bos')).toBe(true);

		// The same file again: the choice sticks
		expect(store.importPlayers(withoutIds(row(1, 'John Smith', 'BOS'), row(2, 'John Smith', 'NYK')))).toEqual({ ambiguous: 0, missing: 0 });
		expect(store.watch_list).toEqual(['n:john smith#bos']);
	});

	it('moves name-matched entries onto IDs automatically when the match is unique', () => {
		store.importPlayers(withoutIds(row(1, 'Nikola Jokic', 'DEN')));
		store.addToList({ list: 'my_team', key: 'n:nikola jokic' });

		const result = store.importPlayers(withIds(row(4, 'Nikola Jokić', 'DEN', 'jokicni01')));
		expect(result).toEqual({ ambiguous: 0, missing: 0 });
		expect(store.my_team).toEqual(['jokicni01']);
		expect(store.list_names).toEqual({ jokicni01: 'Nikola Jokić' });
	});
});
