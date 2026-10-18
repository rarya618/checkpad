// Numbers for Figma "Event analytics" and "Analytics". They use only check-in times, walk-in
// flags, Bevy ticket types and emails (docs/migration-plan.md, Analytics data).
import { formatClockTime } from '@checkpad/shared/format';
import type { DashboardEvent } from './events';
import type { RosterAttendee } from './mock';

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

export function eventResult(event: DashboardEvent, roster: RosterAttendee[]): EventResult {
	const checkedIn = roster.filter((a) => a.checkedInAt).length;
	return { event, registered: roster.length, checkedIn, walkIns: roster.filter((a) => a.walkIn).length, turnout: percent(checkedIn, roster.length) };
}

/**
 * Share of check-ins (in `events`) by someone who checked in to an earlier event of theirs,
 * matched by email. In the real app this runs on the server or behind organiser-only rules.
 */
export function returningShare(events: DashboardEvent[], allEvents: DashboardEvent[], rosters: Record<string, RosterAttendee[]>) {
	const firstSeen = new Map<string, number>();
	for (const e of [...allEvents].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
		for (const a of rosters[e.slug] ?? []) {
			const key = a.email.toLowerCase();
			if (a.checkedInAt && !firstSeen.has(key)) firstSeen.set(key, new Date(e.startsAt).getTime());
		}
	}
	let checkIns = 0;
	let returning = 0;
	for (const e of events) {
		const start = new Date(e.startsAt).getTime();
		for (const a of rosters[e.slug] ?? []) {
			if (!a.checkedInAt) continue;
			checkIns++;
			if ((firstSeen.get(a.email.toLowerCase()) ?? start) < start) returning++;
		}
	}
	return percent(returning, checkIns);
}

export const ranges = [
	{ id: '3', label: 'Last 3 months', months: 3 },
	{ id: '6', label: 'Last 6 months', months: 6 },
	{ id: '12', label: 'Last 12 months', months: 12 },
	{ id: 'all', label: 'All time', months: Infinity },
];

/** Finished events of a team since the first of the month `months` ago, oldest first. */
export function eventsInRange(events: DashboardEvent[], team: string, months: number, now = new Date()) {
	const from = Number.isFinite(months) ? new Date(now.getFullYear(), now.getMonth() - months, 1).getTime() : -Infinity;
	return events
		.filter((e) => e.team === team && new Date(e.endsAt).getTime() < now.getTime() && new Date(e.startsAt).getTime() >= from)
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
