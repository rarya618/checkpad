// In-memory attendee store shared by every dashboard page, so checking someone in
// on the Attendees page also updates the Events page. Swap for API calls later.
import type { CheckpadEvent } from '@checkpad/shared/events';
import { mockEvents } from '@checkpad/shared/mock-events';
import { useMemo, useSyncExternalStore } from 'react';
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

export interface EventSummary {
	event: CheckpadEvent;
	stats: RosterStats;
}

export function useEventSummaries(): EventSummary[] {
	const all = useSyncExternalStore(subscribe, () => rosters);
	return useMemo(
		() =>
			mockEvents
				.map((event) => ({ event, stats: rosterStats(all[event.slug] ?? EMPTY) }))
				.sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt)),
		[all],
	);
}

export function findEvent(slug: string | undefined) {
	return mockEvents.find((event) => event.slug === slug);
}
