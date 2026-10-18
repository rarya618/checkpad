// In-memory attendee store shared by every dashboard page, so checking someone in
// on the Attendees page also updates the Events page. Swap for API calls later.
import { useSyncExternalStore } from 'react';
import { buildMockRosters, type RosterAttendee } from './mock';

let rosters = buildMockRosters();
const listeners = new Set<() => void>();
const EMPTY: RosterAttendee[] = [];

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setCheckedIn(eventSlug: string, attendeeId: string, checkedInAt: Date | null) {
	rosters = {
		...rosters,
		[eventSlug]: (rosters[eventSlug] ?? EMPTY).map((a) => (a.id === attendeeId ? { ...a, checkedInAt } : a)),
	};
	listeners.forEach((listener) => listener());
}

/** Adds someone who didn't register, already checked in, with the next walk-in ticket. */
export function addWalkIn(
	eventSlug: string,
	person: Pick<RosterAttendee, 'firstName' | 'lastName' | 'email'>,
	ticketPrefix: string,
): RosterAttendee {
	const roster = rosters[eventSlug] ?? EMPTY;
	const attendee: RosterAttendee = {
		id: `${eventSlug}-walk-in-${Date.now()}`,
		...person,
		ticket: nextWalkInTicket(roster, ticketPrefix),
		walkIn: true,
		checkedInAt: new Date(),
	};
	rosters = { ...rosters, [eventSlug]: [...roster, attendee] };
	listeners.forEach((listener) => listener());
	return attendee;
}

export function nextWalkInTicket(roster: RosterAttendee[], ticketPrefix: string) {
	return `${ticketPrefix}${String(roster.filter((a) => a.walkIn).length + 1).padStart(4, '0')}`;
}

export function removeAttendee(eventSlug: string, attendeeId: string) {
	rosters = { ...rosters, [eventSlug]: (rosters[eventSlug] ?? EMPTY).filter((a) => a.id !== attendeeId) };
	listeners.forEach((listener) => listener());
}

export function useRoster(eventSlug: string) {
	return useSyncExternalStore(subscribe, () => rosters[eventSlug] ?? EMPTY);
}

export function useAllRosters() {
	return useSyncExternalStore(subscribe, () => rosters);
}

/** Moves an event's attendees when its link changes (events.ts). */
export function renameRoster(from: string, to: string) {
	const { [from]: moved = EMPTY, ...rest } = rosters;
	rosters = { ...rest, [to]: moved };
	listeners.forEach((listener) => listener());
}

export function removeRoster(eventSlug: string) {
	const { [eventSlug]: _removed, ...rest } = rosters;
	rosters = rest;
	listeners.forEach((listener) => listener());
}

export interface RosterStats {
	total: number;
	checkedIn: number;
	preRegistered: number;
	walkIns: number;
	notArrived: number;
}

export function rosterStats(roster: RosterAttendee[]): RosterStats {
	let preRegistered = 0;
	let walkIns = 0;
	for (const a of roster) {
		if (!a.checkedInAt) continue;
		if (a.walkIn) walkIns++;
		else preRegistered++;
	}
	const checkedIn = preRegistered + walkIns;
	return { total: roster.length, checkedIn, preRegistered, walkIns, notArrived: roster.length - checkedIn };
}
