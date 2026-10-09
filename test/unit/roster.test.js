import { describe, it, expect } from 'vitest';
import { assignRoster, parseSlots, canFill, openSlots, DEFAULT_SLOTS } from '../../client/store/roster';

const p = (id, positions, score, ir = false) => ({ id, positions, score, ir });
const lineup = (result) => result.assignments.map(({ slot, player }) => `${slot}:${player ? player.id : '-'}`);

describe('parseSlots', () => {
	it('parses a comma list in any case and reports unknown entries', () => {
		expect(parseSlots('pg, SG , util,bench, ir')).toEqual({ slots: ['PG', 'SG', 'UTIL', 'Bench', 'IR'], invalid: [] });
		expect(parseSlots('PG, QB, , C').invalid).toEqual(['QB']);
		expect(parseSlots('g/f, PF/C').slots).toEqual(['G/F', 'PF/C']);
	});

	it('round-trips the default ESPN slots', () => {
		expect(parseSlots(DEFAULT_SLOTS.join(', ')).slots).toEqual(DEFAULT_SLOTS);
	});
});

describe('canFill', () => {
	it('maps flex slots to positions', () => {
		expect(canFill('G', ['SG'])).toBe(true);
		expect(canFill('G', ['SF'])).toBe(false);
		expect(canFill('F', ['PF'])).toBe(true);
		expect(canFill('UTIL', ['C'])).toBe(true);
		expect(canFill('Bench', ['C'])).toBe(false);
		expect(canFill('G/F', ['SF'])).toBe(true);
		expect(canFill('G/F', ['C'])).toBe(false);
		expect(canFill('PF/C', ['C'])).toBe(true);
		expect(canFill('F/C', ['PG'])).toBe(false);
	});
});

describe('assignRoster', () => {
	it('fills specific slots before flex slots', () => {
		const result = assignRoster([p(1, ['PG'], 2), p(2, ['PG'], 1)], ['G', 'PG']);
		// The better PG takes PG; the other still fits G
		expect(lineup(result)).toEqual(['G:2', 'PG:1']);
	});

	it('uses dual eligibility to fill more slots', () => {
		// Greedy best-first would put player 1 at PG and leave SG empty; matching moves them to SG
		const result = assignRoster([p(1, ['PG', 'SG'], 3), p(2, ['PG'], 2)], ['PG', 'SG']);
		expect(lineup(result)).toEqual(['PG:2', 'SG:1']);
	});

	it('starts higher scores and benches the rest, then reports overflow', () => {
		const players = [p(1, ['C'], 1), p(2, ['C'], 3), p(3, ['C'], 2), p(4, ['C'], 0)];
		const result = assignRoster(players, ['C', 'Bench', 'Bench']);
		expect(lineup(result)).toEqual(['C:2', 'Bench:3', 'Bench:1']);
		expect(result.overflow.map(player => player.id)).toEqual([4]);
	});

	it('puts IR players only in IR slots', () => {
		const result = assignRoster([p(1, ['PG'], 5, true), p(2, ['PG'], 1)], ['PG', 'Bench', 'IR']);
		expect(lineup(result)).toEqual(['PG:2', 'Bench:-', 'IR:1']);
	});

	it('sends extra IR players to overflow', () => {
		const result = assignRoster([p(1, ['C'], 1, true), p(2, ['C'], 2, true)], ['C', 'IR']);
		expect(lineup(result)).toEqual(['C:-', 'IR:2']);
		expect(result.overflow.map(player => player.id)).toEqual([1]);
	});

	it('treats unscored players as the lowest priority', () => {
		const result = assignRoster([p(1, ['SF'], undefined), p(2, ['SF'], 0.5)], ['SF', 'Bench']);
		expect(lineup(result)).toEqual(['SF:2', 'Bench:1']);
	});

	it('fills the default ESPN roster', () => {
		const players = [
			p(1, ['PG'], 9), p(2, ['SG'], 8), p(3, ['SF'], 7), p(4, ['PF'], 6), p(5, ['C'], 5),
			p(6, ['PG'], 4), p(7, ['PF'], 3), p(8, ['C'], 2.5), p(9, ['C'], 2), p(10, ['SG'], 1.5), p(11, ['SF'], 1)
		];
		const result = assignRoster(players, DEFAULT_SLOTS);
		expect(lineup(result)).toEqual([
			'PG:1', 'SG:2', 'SF:3', 'PF:4', 'C:5', 'G:6', 'F:7', 'UTIL:8', 'UTIL:9', 'UTIL:10',
			'Bench:11', 'Bench:-', 'Bench:-', 'Bench:-', 'IR:-'
		]);
		expect(openSlots(result.assignments)).toEqual([{ slot: 'Bench', count: 3 }]);
	});
});
