// Where an event is in its life, for the Events page. The shared checkInStatus() answers what
// attendees see ("Not open yet" or "Check-in closed"); organisers also need to know that an
// event is on today but nobody has opened check-in, or that check-in was left on after it ended.
import type { DashboardEvent } from './events';

export type EventPhase =
	/** Self check-in is on and the event hasn't ended. */
	| 'live'
	/** On today (or under way) with self check-in off and not yet opened today. */
	| 'today'
	/** Under way, and self check-in was closed on the day. */
	| 'closed-early'
	/** Self check-in is still on after the event ended. */
	| 'stale-open'
	| 'upcoming'
	| 'past';

const HOUR = 3_600_000;

const day = (date: Date, timeZone: string) => date.toLocaleDateString('en-CA', { timeZone });

/** Whether the event starts today where it's held. */
export const startsToday = (event: Pick<DashboardEvent, 'startsAt' | 'timeZone'>, now = new Date()) =>
	day(new Date(event.startsAt), event.timeZone) === day(now, event.timeZone);

export function eventPhase(event: Pick<DashboardEvent, 'startsAt' | 'endsAt' | 'timeZone' | 'selfCheckInOpen' | 'selfCheckInChangedAt'>, now = new Date()): EventPhase {
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const ended = now >= end;
	if (event.selfCheckInOpen) return ended ? 'stale-open' : 'live';
	if (ended) return 'past';
	if (now < start && !startsToday(event, now)) return 'upcoming';
	// Switched off within 12 hours of the start: it was opened for this event and closed again
	const changed = event.selfCheckInChangedAt ? new Date(event.selfCheckInChangedAt).getTime() : 0;
	return changed >= start.getTime() - 12 * HOUR ? 'closed-early' : 'today';
}

export type EventGroup = 'now' | 'upcoming' | 'past';

/** Now: open, or on today. Upcoming: later days. Past: ended and closed. */
export const groupOf = (phase: EventPhase): EventGroup =>
	phase === 'upcoming' ? 'upcoming' : phase === 'past' ? 'past' : 'now';
