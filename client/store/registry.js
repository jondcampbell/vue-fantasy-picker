// Links ESPN player IDs to Basketball-Reference IDs so data from either source maps to the same player.
// Links are stored as { [espnId]: bbrefId }; manual links are kept and never overwritten.
// Kept store-free so it can be unit tested.

import { nameKey } from './identity';

// Letter-pair similarity (Dice coefficient) for suggesting likely matches, e.g. "Ronald Holland" ~ "Ron Holland"
export const nameSimilarity = function(a, b) {
	const pairs = (text) => {
		const clean = nameKey(text).replace(/\s/g, '');
		const result = [];
		for (let i = 0; i < clean.length - 1; i++) {
			result.push(clean.slice(i, i + 2));
		}
		return result;
	};
	const left = pairs(a);
	const right = pairs(b);
	if (left.length === 0 || right.length === 0) {
		return 0;
	}
	const remaining = [...right];
	let shared = 0;
	left.forEach(pair => {
		const index = remaining.indexOf(pair);
		if (index >= 0) {
			shared++;
			remaining.splice(index, 1);
		}
	});
	return (2 * shared) / (left.length + right.length);
};

/**
 * espnPlayers: [{ espnId, name, team, gp }]   (gp in the season both sources cover, to break name ties)
 * bbrefPlayers: [{ bbrefId, name, team, gp }]
 * links: existing { [espnId]: bbrefId }
 * Returns { links, unlinked: [{ espnId, name, team, reason, candidates: [{ bbrefId, name, team, gp }] }] }
 * unlinked lists ESPN players with no (or no single) name match, with the closest unlinked
 * Basketball-Reference players as suggestions (none for e.g. rookies who have no data there yet).
 */
export const linkPlayers = function(espnPlayers, bbrefPlayers, links = {}) {
	const result = { ...links };
	const linkedBbref = new Set(Object.values(result));
	const byName = new Map();
	bbrefPlayers.forEach(player => {
		const key = nameKey(player.name);
		if (!byName.has(key)) byName.set(key, []);
		byName.get(key).push(player);
	});

	const pending = [];
	espnPlayers.forEach(player => {
		if (result[player.espnId]) {
			return;
		}
		const candidates = (byName.get(nameKey(player.name)) || []).filter(candidate => !linkedBbref.has(candidate.bbrefId));
		let match = candidates.length === 1 ? candidates[0] : null;
		if (candidates.length > 1) {
			const sameGames = candidates.filter(candidate => candidate.gp === player.gp);
			match = sameGames.length === 1 ? sameGames[0] : null;
		}
		if (match) {
			result[player.espnId] = match.bbrefId;
			linkedBbref.add(match.bbrefId);
		} else {
			pending.push({ player, reason: candidates.length > 1 ? 'ambiguous' : 'no-match' });
		}
	});

	const unlinkedBbref = bbrefPlayers.filter(player => !linkedBbref.has(player.bbrefId));
	const unlinked = pending.map(({ player, reason }) => ({
		espnId: player.espnId,
		name: player.name,
		team: player.team,
		reason: reason,
		candidates: unlinkedBbref
			.map(candidate => ({ candidate, score: nameSimilarity(player.name, candidate.name) }))
			.filter(({ score }) => score >= 0.6)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5)
			.map(({ candidate }) => ({ bbrefId: candidate.bbrefId, name: candidate.name, team: candidate.team, gp: candidate.gp }))
	}));

	return { links: result, unlinked };
};
