// Stable player identity across imports. Lists (my team, taken, watch, overrides, IR) store player keys:
// - With an ID column (Basketball-Reference's "Player-additional", e.g. "jokicni01") the key is that ID.
// - ESPN rows (an "ESPN ID" column, no Basketball-Reference ID) use the linked Basketball-Reference ID from
//   the registry (client/store/registry.js), or "espn:<id>" until they are linked.
// - Without either, the key is "n:" + the normalized name; namesakes in the same file get "#<team>" appended.
// Kept store-free so it can be unit tested.

const ID_HEADERS = ['player-additional', 'player id', 'player_id', 'playerid'];

export const detectKeyColumn = function(columns) {
	const index = columns.findIndex(column => ID_HEADERS.includes(String(column).trim().toLowerCase()));
	return index >= 0 ? index : null;
};

export const ESPN_PREFIX = 'espn:';

export const detectEspnColumn = function(columns) {
	const index = columns.findIndex(column => String(column).trim().toLowerCase() === 'espn id');
	return index >= 0 ? index : null;
};

// Basketball-Reference team header ("Team", older exports "Tm"), used to tell namesakes apart
export const detectTeamColumn = function(columns) {
	const index = columns.findIndex(column => ['team', 'tm'].includes(String(column).trim().toLowerCase()));
	return index >= 0 ? index : null;
};

// Cyrillic letters that look Latin (Basketball-Reference writes "Egor Dёmin" with a Cyrillic ё)
const CYRILLIC_LOOKALIKES = { 'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'і': 'i' };

// "Nikola Jokić" -> "nikola jokic", "Jaren Jackson Jr." -> "jaren jackson", "A\\abc01" -> "a"
export const nameKey = function(name) {
	return String(name || '')
		.split('\\')[0]
		.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[авекмнорстухі]/g, letter => CYRILLIC_LOOKALIKES[letter])
		.replace(/[.'’]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\s(jr|sr|ii|iii|iv|v)$/, '');
};

const NAME_PREFIX = 'n:';
export const isNameKey = (key) => String(key).startsWith(NAME_PREFIX);

// The name part of a name key ("n:john smith#bos" -> "john smith")
const keyName = (key) => String(key).slice(NAME_PREFIX.length).split('#')[0];

const idKey = (row, keyColumn) => String(row[keyColumn] ?? '').trim();

// Identity used to drop repeated rows of the same player (e.g. traded players' per-team rows)
export const dedupeKey = function(row, config) {
	if (config.key_column != null && idKey(row, config.key_column) !== '') {
		return 'id:' + idKey(row, config.key_column);
	}
	if (config.espn_column != null && idKey(row, config.espn_column) !== '') {
		return ESPN_PREFIX + idKey(row, config.espn_column);
	}
	return 'name:' + nameKey(row[config.name_column]) + '|' + row[config.id_column];
};

// Map of row -> key for a whole (already de-duplicated) dataset. espnLinks: { [espnId]: bbrefId }
export const computeKeys = function(rows, columns, config, espnLinks = {}) {
	const keys = new Map();
	const nameRows = [];

	rows.forEach(row => {
		if (config.key_column != null && idKey(row, config.key_column) !== '') {
			keys.set(row, idKey(row, config.key_column));
		} else if (config.espn_column != null && idKey(row, config.espn_column) !== '') {
			const espnId = idKey(row, config.espn_column);
			keys.set(row, espnLinks[espnId] || ESPN_PREFIX + espnId);
		} else {
			nameRows.push(row);
		}
	});

	// Name keys; namesakes in this file are told apart by team (or row id if there's no team column)
	const counts = new Map();
	nameRows.forEach(row => {
		const base = nameKey(row[config.name_column]);
		counts.set(base, (counts.get(base) || 0) + 1);
	});
	const teamColumn = detectTeamColumn(columns);
	nameRows.forEach(row => {
		const base = nameKey(row[config.name_column]);
		if (counts.get(base) > 1) {
			const tag = teamColumn != null ? row[teamColumn] : row[config.id_column];
			keys.set(row, `${NAME_PREFIX}${base}#${String(tag).trim().toLowerCase()}`);
		} else {
			keys.set(row, NAME_PREFIX + base);
		}
	});

	return keys;
};

/**
 * Match saved list keys against a new dataset.
 * keyRows: Map key -> row for the new data; names: { key: display name } remembered for list entries.
 * Returns a Map oldKey -> { status: 'found' | 'moved' | 'ambiguous' | 'missing', key?, candidates? }
 *   found     - same key exists
 *   moved     - exactly one player matches by name; use `key`. Only tried for name keys or when the
 *               new data has no IDs: a vanished ID is a player who left, not someone to guess at.
 *   ambiguous - several players share the name; `candidates` are their keys
 *   missing   - nobody matches
 */
export const reconcileKeys = function(oldKeys, keyRows, names, config) {
	const byName = new Map();
	keyRows.forEach((row, key) => {
		const base = nameKey(row[config.name_column]);
		if (!byName.has(base)) byName.set(base, []);
		byName.get(base).push(key);
	});

	const result = new Map();
	oldKeys.forEach(oldKey => {
		if (keyRows.has(oldKey)) {
			result.set(oldKey, { status: 'found', key: oldKey });
			return;
		}
		if (!isNameKey(oldKey) && (config.key_column != null || config.espn_column != null)) {
			result.set(oldKey, { status: 'missing' });
			return;
		}
		const base = names[oldKey] ? nameKey(names[oldKey]) : keyName(oldKey);
		const candidates = byName.get(base) || [];
		if (candidates.length === 1) {
			result.set(oldKey, { status: 'moved', key: candidates[0] });
		} else if (candidates.length > 1) {
			result.set(oldKey, { status: 'ambiguous', candidates });
		} else {
			result.set(oldKey, { status: 'missing' });
		}
	});
	return result;
};
