import { describe, expect, it } from 'vitest';
import { eventPhase, groupOf, startsToday } from './eventPhase';

// An evening event in Sydney (AEDT, UTC+11): Thu 10 Dec 2026, 6pm–9pm local
const evening = {
	startsAt: '2026-12-10T07:00:00.000Z',
	endsAt: '2026-12-10T10:00:00.000Z',
	timeZone: 'Australia/Sydney',
	selfCheckInOpen: false,
	selfCheckInChangedAt: null,
};
const at = (iso: string) => new Date(iso);

describe('startsToday', () => {
	it('goes by the day where the event is held', () => {
		// 00:30 on 10 Dec in Sydney is still 9 Dec in UTC
		expect(startsToday(evening, at('2026-12-09T13:30:00Z'))).toBe(true);
		// 23:59 on 9 Dec in Sydney
		expect(startsToday(evening, at('2026-12-09T12:59:00Z'))).toBe(false);
	});
});

describe('eventPhase', () => {
	it('is upcoming before the day it starts', () => expect(eventPhase(evening, at('2026-12-09T12:59:00Z'))).toBe('upcoming'));
	it('is today from midnight on the day, while check-in is off', () => expect(eventPhase(evening, at('2026-12-09T13:00:00Z'))).toBe('today'));
	it('is today while under way and never opened', () => expect(eventPhase(evening, at('2026-12-10T08:00:00Z'))).toBe('today'));
	it('is live while check-in is on', () => expect(eventPhase({ ...evening, selfCheckInOpen: true }, at('2026-12-10T08:00:00Z'))).toBe('live'));

	it('has ended exactly at its end time', () => {
		expect(eventPhase(evening, at('2026-12-10T09:59:59.999Z'))).toBe('today');
		expect(eventPhase(evening, at('2026-12-10T10:00:00Z'))).toBe('past');
		expect(eventPhase({ ...evening, selfCheckInOpen: true }, at('2026-12-10T10:00:00Z'))).toBe('stale-open');
	});

	it('is closed early when check-in was switched off within 12 hours of the start', () => {
		const now = at('2026-12-10T09:00:00Z');
		expect(eventPhase({ ...evening, selfCheckInChangedAt: '2026-12-10T08:30:00Z' }, now)).toBe('closed-early');
		expect(eventPhase({ ...evening, selfCheckInChangedAt: '2026-12-09T19:00:00Z' }, now)).toBe('closed-early'); // exactly 12 hours before
		expect(eventPhase({ ...evening, selfCheckInChangedAt: '2026-12-09T18:59:59Z' }, now)).toBe('today'); // switched off for an earlier event
	});

	describe('over several days', () => {
		// Sat 12 Dec 9am – Sun 13 Dec 5pm, Sydney
		const weekend = { ...evening, startsAt: '2026-12-11T22:00:00.000Z', endsAt: '2026-12-13T06:00:00.000Z' };

		it('counts only closing it today', () => {
			const sundayMorning = at('2026-12-12T21:00:00Z'); // 8am Sunday
			expect(eventPhase({ ...weekend, selfCheckInChangedAt: '2026-12-12T07:00:00Z' }, sundayMorning)).toBe('today'); // closed 6pm Saturday
			expect(eventPhase({ ...weekend, selfCheckInChangedAt: '2026-12-12T20:30:00Z' }, sundayMorning)).toBe('closed-early'); // closed 7:30am Sunday
		});
	});
});

describe('groupOf', () => {
	it('puts every phase but upcoming and past under Now', () => {
		expect(groupOf('upcoming')).toBe('upcoming');
		expect(groupOf('past')).toBe('past');
		for (const phase of ['live', 'today', 'closed-early', 'stale-open'] as const) expect(groupOf(phase)).toBe('now');
	});
});
