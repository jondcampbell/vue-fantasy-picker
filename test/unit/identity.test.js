import { describe, it, expect } from 'vitest';
import { nameKey, detectKeyColumn, detectTeamColumn, dedupeKey, computeKeys, reconcileKeys, isNameKey } from '../../client/store/identity';

// Columns: 0 Rk, 1 Player, 2 Team, 3 Player-additional
const columns = ['Rk', 'Player', 'Team', 'Player-additional'];
const idConfig = { id_column: 0, name_column: 1, key_column: 3 };
const nameConfig = { id_column: 0, name_column: 1, key_column: null };

const keysOf = (rows, config, cols = columns) => {
	const keys = computeKeys(rows, cols, config);
	return rows.map(row => keys.get(row));
};
const keyRowsOf = (rows, config) => {
	const keyRows = new Map();
	computeKeys(rows, columns, config).forEach((key, row) => keyRows.set(key, row));
	return keyRows;
};

describe('nameKey', () => {
	it('ignores accents, case, punctuation and suffixes', () => {
		expect(nameKey('Nikola Jokić')).toBe('nikola jokic');
		expect(nameKey('Alperen Şengün')).toBe('alperen sengun');
		expect(nameKey('Jaren Jackson Jr.')).toBe('jaren jackson');
		expect(nameKey('John Lucas III\\lucasjo02')).toBe('john lucas');
		expect(nameKey("De'Aaron  Fox")).toBe('deaaron fox');
	});
});

describe('column detection', () => {
	it('finds the Basketball-Reference ID and team columns', () => {
		expect(detectKeyColumn(columns)).toBe(3);
		expect(detectKeyColumn(['Rk', 'Player'])).toBe(null);
		expect(detectTeamColumn(['Rk', 'Player', 'Tm'])).toBe(2);
		expect(detectTeamColumn(['Rk', 'Player'])).toBe(null);
	});
});

describe('dedupeKey', () => {
	it('groups traded rows by ID, or by name and rank without IDs', () => {
		expect(dedupeKey(['5', 'A', '2TM', 'aaa01'], idConfig)).toBe(dedupeKey(['5', 'A', 'BOS', 'aaa01'], idConfig));
		expect(dedupeKey(['5', 'John Smith', 'BOS'], nameConfig)).not.toBe(dedupeKey(['9', 'John Smith', 'NYK'], nameConfig));
	});
});

describe('computeKeys', () => {
	it('uses the ID column when present', () => {
		expect(keysOf([['1', 'Nikola Jokić', 'DEN', 'jokicni01']], idConfig)).toEqual(['jokicni01']);
	});

	it('falls back to name keys, separating namesakes by team', () => {
		const rows = [['1', 'John Smith', 'BOS'], ['2', 'John Smith', 'NYK'], ['3', 'Nikola Jokić', 'DEN']];
		const keys = keysOf(rows, nameConfig, ['Rk', 'Player', 'Team']);
		expect(keys).toEqual(['n:john smith#bos', 'n:john smith#nyk', 'n:nikola jokic']);
		expect(keys.every(isNameKey)).toBe(true);
	});

	it('separates namesakes by row id when there is no team column', () => {
		const rows = [['1', 'John Smith'], ['2', 'John Smith']];
		expect(keysOf(rows, nameConfig, ['Rk', 'Player'])).toEqual(['n:john smith#1', 'n:john smith#2']);
	});

	it('uses a name key for a row with a blank ID', () => {
		expect(keysOf([['1', 'Rookie Guy', 'BOS', '']], idConfig)).toEqual(['n:rookie guy']);
	});
});

describe('reconcileKeys', () => {
	const idRows = [['1', 'Nikola Jokić', 'DEN', 'jokicni01'], ['2', 'John Smith', 'BOS', 'smithjo01'], ['3', 'John Smith', 'NYK', 'smithjo02']];

	it('keeps keys that still exist', () => {
		const result = reconcileKeys(['jokicni01'], keyRowsOf(idRows, idConfig), {}, idConfig);
		expect(result.get('jokicni01')).toEqual({ status: 'found', key: 'jokicni01' });
	});

	it('never guesses by name for a vanished ID when the new data has IDs', () => {
		const names = { smithjo09: 'John Smith', jokicx01: 'Nikola Jokić' };
		const result = reconcileKeys(['smithjo09', 'jokicx01'], keyRowsOf(idRows, idConfig), names, idConfig);
		expect(result.get('smithjo09')).toEqual({ status: 'missing' });
		expect(result.get('jokicx01')).toEqual({ status: 'missing' });
	});

	it('moves name keys onto IDs when exactly one player matches', () => {
		const result = reconcileKeys(['n:nikola jokic'], keyRowsOf(idRows, idConfig), {}, idConfig);
		expect(result.get('n:nikola jokic')).toEqual({ status: 'moved', key: 'jokicni01' });
	});

	it('flags ambiguous names instead of guessing', () => {
		const result = reconcileKeys(['n:john smith'], keyRowsOf(idRows, idConfig), {}, idConfig);
		expect(result.get('n:john smith')).toEqual({ status: 'ambiguous', candidates: ['smithjo01', 'smithjo02'] });
	});

	it('matches saved IDs by remembered name when the new data has no IDs', () => {
		const nameRows = [['7', 'Nikola Jokic', 'DEN']];
		const result = reconcileKeys(['jokicni01'], keyRowsOf(nameRows, nameConfig), { jokicni01: 'Nikola Jokić' }, nameConfig);
		expect(result.get('jokicni01')).toEqual({ status: 'moved', key: 'n:nikola jokic' });
	});

	it('reports players who are gone', () => {
		const result = reconcileKeys(['n:retired guy'], keyRowsOf(idRows, idConfig), {}, idConfig);
		expect(result.get('n:retired guy')).toEqual({ status: 'missing' });
	});
});
