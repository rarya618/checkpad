// Numbers for Figma "Event analytics" and "Analytics". They use only check-in times, walk-in
// flags, Bevy ticket types and emails (docs/migration-plan.md, Analytics data).
import { formatClockTime } from '@checkpad/shared/format';
import type { DashboardEvent } from './events';
import type { RosterAttendee } from './roster';

export interface ArrivalBin {
	/** "18:15" */
	label: string;
	/** "18:15–18:30" */
	range: string;
	preRegistered: number;
	walkIns: number;
}

const QUARTER = 15 * 60_000;

/** Check-ins every 15 minutes from the start to the end of the event (later arrivals join the last bin). */
export function arrivalBins(event: DashboardEvent, roster: RosterAttendee[]): ArrivalBin[] {
	const start = new Date(event.startsAt).getTime();
	const end = new Date(event.endsAt).getTime();
	const count = Math.max(1, Math.ceil((end - start) / QUARTER));
	const bins: ArrivalBin[] = Array.from({ length: count }, (_, i) => ({
		label: formatClockTime(new Date(start + i * QUARTER), event.timeZone),
		range: `${formatClockTime(new Date(start + i * QUARTER), event.timeZone)}–${formatClockTime(new Date(start + (i + 1) * QUARTER), event.timeZone)}`,
		preRegistered: 0,
		walkIns: 0,
	}));
	for (const a of roster) {
		if (!a.checkedInAt) continue;
		const i = Math.min(count - 1, Math.max(0, Math.floor((a.checkedInAt.getTime() - start) / QUARTER)));
		if (a.walkIn) bins[i].walkIns++;
		else bins[i].preRegistered++;
	}
	return bins;
}

export function busiestBin(bins: ArrivalBin[]) {
	let best: ArrivalBin | null = null;
	for (const b of bins) if (b.preRegistered + b.walkIns > (best ? best.preRegistered + best.walkIns : 0)) best = b;
	return best;
}

/** Registered (not walk-in) people by Bevy ticket type, largest first. */
export function byTicketType(roster: RosterAttendee[]) {
	const types = new Map<string, { total: number; checkedIn: number }>();
	for (const a of roster) {
		if (a.walkIn) continue;
		const t = types.get(a.ticketType ?? 'Other') ?? { total: 0, checkedIn: 0 };
		t.total++;
		if (a.checkedInAt) t.checkedIn++;
		types.set(a.ticketType ?? 'Other', t);
	}
	return [...types].map(([name, t]) => ({ name, ...t })).sort((a, b) => b.total - a.total);
}

/** A tidy axis: about four steps of 1, 2, 2.5 or 5 × 10ⁿ covering `max`. */
export function niceTicks(max: number, steps = 3) {
	if (max <= 0) return [0, 1];
	const raw = max / steps;
	const pow = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
	const top = Math.ceil(max / step) * step;
	return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => +(i * step).toFixed(6));
}

export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export interface EventResult {
	event: DashboardEvent;
	registered: number;
	checkedIn: number;
	walkIns: number;
	turnout: number;
}

/** From the counts the trigger keeps, so Analytics doesn't wait for every attendee list. */
export function eventResult(event: DashboardEvent): EventResult {
	const { registered, checkedIn, walkIns } = event.counts;
	return { event, registered, checkedIn, walkIns, turnout: percent(checkedIn, registered) };
}

/** Each email's first check-in: the start of the earliest event in `allEvents` they came to. */
export function firstCheckIns(allEvents: DashboardEvent[], rosters: Record<string, RosterAttendee[]>) {
	const firstSeen = new Map<string, number>();
	for (const e of [...allEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
		for (const a of rosters[e.id] ?? []) {
			const key = a.email.toLowerCase();
			if (a.checkedInAt && !firstSeen.has(key)) firstSeen.set(key, new Date(e.startsAt).getTime());
		}
	}
	return firstSeen;
}

/** One event's check-ins split into people who came to an earlier event and first-timers. */
export function newVsReturning(event: DashboardEvent, roster: RosterAttendee[], firstSeen: Map<string, number>) {
	const start = new Date(event.startsAt).getTime();
	const seen = new Set<string>();
	let returning = 0;
	let firstTime = 0;
	for (const a of roster) {
		const key = a.email.toLowerCase();
		if (!a.checkedInAt || seen.has(key)) continue;
		seen.add(key);
		if ((firstSeen.get(key) ?? start) < start) returning++;
		else firstTime++;
	}
	return { returning, firstTime };
}

/**
 * Share of check-ins (in `events`) by someone who checked in to an earlier event of theirs,
 * matched by email. `allEvents` are every earlier event to look in; `rosters` by event ID.
 */
export function returningShare(events: DashboardEvent[], allEvents: DashboardEvent[], rosters: Record<string, RosterAttendee[]>) {
	const firstSeen = firstCheckIns(allEvents, rosters);
	let checkIns = 0;
	let returning = 0;
	for (const e of events) {
		const split = newVsReturning(e, rosters[e.id] ?? [], firstSeen);
		checkIns += split.returning + split.firstTime;
		returning += split.returning;
	}
	return percent(returning, checkIns);
}

export interface MethodSplit {
	/** Checked themselves in on the attendee page, walk-ins included. */
	self: number;
	/** Checked in or added by an organiser from the dashboard. */
	staff: number;
	/** Check-ins per organiser's email, most first. */
	byOrganiser: { email: string; count: number }[];
}

/** How an event's check-ins happened; null for a migrated event, where nobody recorded it. */
export function checkInMethods(event: DashboardEvent, roster: RosterAttendee[]): MethodSplit | null {
	if (event.migrated) return null;
	const byOrganiser = new Map<string, number>();
	let self = 0;
	for (const a of roster) {
		if (!a.checkedInAt) continue;
		if (a.checkedInBy) byOrganiser.set(a.checkedInBy, (byOrganiser.get(a.checkedInBy) ?? 0) + 1);
		else self++;
	}
	const list = [...byOrganiser].map(([email, count]) => ({ email, count })).sort((a, b) => b.count - a.count || a.email.localeCompare(b.email));
	return { self, staff: list.reduce((n, o) => n + o.count, 0), byOrganiser: list };
}

export interface Person {
	email: string;
	name: string;
	/** Events they registered for (Bevy tickets, not walk-ins). */
	registered: number;
	/** Events they checked in to, walk-ins included. */
	attended: number;
	/** Start of the last event they checked in to or registered for. */
	lastAt: string;
}

/** Everyone on the lists of `events`, by email; several tickets to one event count once. */
export function people(events: DashboardEvent[], rosters: Record<string, RosterAttendee[]>) {
	const byEmail = new Map<string, Person>();
	for (const e of events) {
		const here = new Map<string, { registered: boolean; attended: boolean; name: string }>();
		for (const a of rosters[e.id] ?? []) {
			const key = a.email.toLowerCase();
			const h = here.get(key) ?? { registered: false, attended: false, name: '' };
			h.registered ||= !a.walkIn;
			h.attended ||= Boolean(a.checkedInAt);
			h.name ||= `${a.firstName} ${a.lastName}`.trim();
			here.set(key, h);
		}
		for (const [email, h] of here) {
			const p = byEmail.get(email) ?? { email, name: h.name, registered: 0, attended: 0, lastAt: e.startsAt };
			if (h.registered) p.registered++;
			if (h.attended) p.attended++;
			if (e.startsAt >= p.lastAt) {
				p.lastAt = e.startsAt;
				p.name = h.name || p.name;
			}
			byEmail.set(email, p);
		}
	}
	return [...byEmail.values()];
}

/** People who came to two or more of the events, most events first. */
export const regulars = (list: Person[]) =>
	list.filter((p) => p.attended >= 2).sort((a, b) => b.attended - a.attended || b.lastAt.localeCompare(a.lastAt) || a.name.localeCompare(b.name));

/** People who registered for `min` or more of the events and came to none, most registrations first. */
export const repeatNoShows = (list: Person[], min = 3) =>
	list.filter((p) => p.registered >= min && p.attended === 0).sort((a, b) => b.registered - a.registered || b.lastAt.localeCompare(a.lastAt) || a.name.localeCompare(b.name));

/** Which axis labels to show so about `fit` fit: every `n`th, counted back from the latest. */
export const thinLabels = (count: number, fit = 8) => {
	const step = Math.max(1, Math.ceil(count / fit));
	return (i: number) => (count - 1 - i) % step === 0;
};

export const ranges = [
	{ id: '3', label: 'Last 3 months', months: 3 },
	{ id: '6', label: 'Last 6 months', months: 6 },
	{ id: '12', label: 'Last 12 months', months: 12 },
	{ id: 'all', label: 'All time', months: Infinity },
];

/** Finished events of a team since the first of the month `months` ago, oldest first. */
export function eventsInRange(events: DashboardEvent[], teamId: string, months: number, now = new Date()) {
	const from = Number.isFinite(months) ? new Date(now.getFullYear(), now.getMonth() - months, 1).getTime() : -Infinity;
	return events
		.filter((e) => e.teamId === teamId && new Date(e.endsAt).getTime() < now.getTime() && new Date(e.startsAt).getTime() >= from)
		.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** "April to September" */
export function monthSpan(events: DashboardEvent[]) {
	if (!events.length) return 'No finished events';
	const month = (e: DashboardEvent) => new Intl.DateTimeFormat('en-AU', { month: 'long', timeZone: e.timeZone }).format(new Date(e.startsAt));
	const first = month(events[0]);
	const last = month(events[events.length - 1]);
	return first === last ? first : `${first} to ${last}`;
}
