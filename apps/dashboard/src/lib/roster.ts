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
