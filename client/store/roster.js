// Pure roster-slot logic: which players fill which lineup slots. Kept store-free so it can be unit tested.

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
export const BENCH = 'Bench';
export const IR = 'IR';

// Positions each starter slot accepts; UTIL and Bench take anyone, IR only takes players marked IR
const SLOT_POSITIONS = {
	PG: ['PG'],
	SG: ['SG'],
	SF: ['SF'],
	PF: ['PF'],
	C: ['C'],
	G: ['PG', 'SG'],
	F: ['SF', 'PF'],
	// ESPN combo slots
	'SG/SF': ['SG', 'SF'],
	'G/F': ['PG', 'SG', 'SF', 'PF'],
	'PF/C': ['PF', 'C'],
	'F/C': ['SF', 'PF', 'C'],
	UTIL: POSITIONS
};
export const SLOT_TYPES = [...Object.keys(SLOT_POSITIONS), BENCH, IR];

export const DEFAULT_SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'UTIL', 'UTIL', BENCH, BENCH, BENCH, BENCH, IR];

// Parse "PG, SG, Bench, IR" (any case) into slot names; unknown entries are reported, not kept
export const parseSlots = function(text) {
	const byUpper = new Map(SLOT_TYPES.map(type => [type.toUpperCase(), type]));
	const slots = [];
	const invalid = [];
	text.split(',').map(part => part.trim()).filter(Boolean).forEach(part => {
		const slot = byUpper.get(part.toUpperCase());
		if (slot) {
			slots.push(slot);
		} else {
			invalid.push(part);
		}
	});
	return { slots, invalid };
};

export const isStarterSlot = (slot) => slot !== BENCH && slot !== IR;

export const canFill = function(slot, positions) {
	return (SLOT_POSITIONS[slot] || []).some(position => positions.includes(position));
};

// Specific slots first, then flex (G, F and combo slots), then UTIL, so flexible slots stay open for players who need them
const slotPriority = (slot) => (slot === 'UTIL' ? 2 : SLOT_POSITIONS[slot]?.length > 1 ? 1 : 0);

// Maximum bipartite matching of players (in priority order) to slot entries [{ slot, index }].
// Earlier players are never displaced from the matching by later ones, only moved between slots.
const maxMatching = function(players, slotEntries) {
	const slotPlayer = new Map(); // slot index -> player

	const tryPlace = function(player, visited) {
		for (const { slot, index } of slotEntries) {
			if (visited.has(index) || !canFill(slot, player.positions)) {
				continue;
			}
			visited.add(index);
			const current = slotPlayer.get(index);
			if (!current || tryPlace(current, visited)) {
				slotPlayer.set(index, player);
				return true;
			}
		}
		return false;
	};

	players.forEach(player => tryPlace(player, new Set()));
	return slotPlayer;
};

/**
 * players: [{ id, positions: ['PG', ...], score, ir }]
 * Returns { assignments: [{ slot, player|null }] in slot order, overflow: [player] }.
 * 1. Pick starters: a maximum matching that favours higher scores.
 * 2. Seat them best-first in the most specific slot that still leaves room for the rest,
 *    so the lineup reads naturally (best PG at PG, not at G).
 * The rest fill Bench in score order; players marked IR fill IR slots.
 */
export const assignRoster = function(players, slots) {
	const byScore = (a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity);
	const active = players.filter(player => !player.ir).sort(byScore);
	const injured = players.filter(player => player.ir).sort(byScore);

	const starterSlots = slots
		.map((slot, index) => ({ slot, index }))
		.filter(({ slot }) => isStarterSlot(slot))
		.sort((a, b) => slotPriority(a.slot) - slotPriority(b.slot));

	const chosen = new Set(maxMatching(active, starterSlots).values());
	const starters = active.filter(player => chosen.has(player));

	const slotPlayer = new Map(); // slot index -> player
	let freeSlots = starterSlots;
	starters.forEach((player, i) => {
		const rest = starters.slice(i + 1);
		const seat = freeSlots.find(entry => {
			if (!canFill(entry.slot, player.positions)) {
				return false;
			}
			const remaining = freeSlots.filter(other => other !== entry);
			return maxMatching(rest, remaining).size === rest.length;
		});
		slotPlayer.set(seat.index, player);
		freeSlots = freeSlots.filter(entry => entry !== seat);
	});

	const leftover = active.filter(player => !chosen.has(player));
	const fillSlots = function(type, queue) {
		slots.forEach((slot, index) => {
			if (slot === type && queue.length > 0) {
				slotPlayer.set(index, queue.shift());
			}
		});
		return queue;
	};
	const overflow = [...fillSlots(BENCH, leftover), ...fillSlots(IR, injured)];

	return {
		assignments: slots.map((slot, index) => ({ slot, player: slotPlayer.get(index) || null })),
		overflow
	};
};

// Open slots grouped for display, e.g. [{ slot: 'UTIL', count: 2 }]; IR is left out
export const openSlots = function(assignments) {
	const counts = new Map();
	assignments.forEach(({ slot, player }) => {
		if (!player && slot !== IR) {
			counts.set(slot, (counts.get(slot) || 0) + 1);
		}
	});
	return [...counts].map(([slot, count]) => ({ slot, count }));
};
