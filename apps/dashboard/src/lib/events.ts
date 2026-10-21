// In-memory event store, like roster.ts, so creating, editing and deleting an event
// shows up on every page. Swap for Firestore later. Teams are in Firestore already (teams.ts);
// events name theirs, matching the seeded team's name.
import { RESERVED_SLUGS, type CheckpadEvent } from '@checkpad/shared/events';
import { mockEvents } from '@checkpad/shared/mock-events';
import { useMemo, useSyncExternalStore } from 'react';
import { pastEvents } from './mock';
import { removeRoster, renameRoster, rosterStats, useAllRosters, type RosterStats } from './roster';

export interface DashboardEvent extends CheckpadEvent {
	team: string;
	walkInTicketTitle: string;
	walkInVenue: string;
	/** Who last opened or closed self check-in, and when (ISO). */
	selfCheckInChangedBy: string | null;
	selfCheckInChangedAt: string | null;
}

const defaults = {
	team: 'GDG Sydney',
	walkInTicketTitle: 'General admission',
	walkInVenue: 'Google Sydney, 1 Pirrama Rd, Pyrmont',
	selfCheckInChangedBy: null,
	selfCheckInChangedAt: null,
};

// September Meetup matches the Figma Event settings screen.
let events: DashboardEvent[] = [...mockEvents, ...pastEvents].map((event) =>
	event.slug === 'gdg-september-meetup'
		? {
				...event,
				...defaults,
				selfCheckInOpen: true,
				selfCheckInChangedBy: 'Russal Arya',
				selfCheckInChangedAt: '2026-09-10T16:45:00+10:00',
			}
		: { ...event, ...defaults },
);
// Old link → new link, so pages and bookmarks under an old link follow the event.
const renames = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function emit() {
	listeners.forEach((listener) => listener());
}

/**
 * A renamed team's events follow it. Events still name their team until they move to
 * Firestore, where they hold its ID (teams.ts).
 */
export function renameTeamEvents(previousName: string, name: string) {
	if (previousName === name) return;
	events = events.map((e) => (e.team === previousName ? { ...e, team: name } : e));
	emit();
}

export function useEvents() {
	return useSyncExternalStore(subscribe, () => events);
}

export function useEvent(slug: string | undefined) {
	return useSyncExternalStore(subscribe, () => events.find((event) => event.slug === slug));
}

/** Where an event that used to live at `slug` lives now, if it was renamed. */
export function renamedSlug(slug: string | undefined) {
	let current = slug && renames.get(slug);
	while (current && renames.has(current)) current = renames.get(current);
	return current || undefined;
}

/** Whether another event has this link, or the attendee site needs it for a page. */
export function isSlugTaken(slug: string, except?: string) {
	return slug !== except && (RESERVED_SLUGS.has(slug) || events.some((event) => event.slug === slug));
}

export function createEvent(event: DashboardEvent) {
	if (isSlugTaken(event.slug)) throw new Error(`Link ${event.slug} is already in use`);
	events = [...events, event];
	emit();
}

/** Replaces the event at `slug`; moves its attendees if the link changed. */
export function updateEvent(slug: string, event: DashboardEvent) {
	if (isSlugTaken(event.slug, slug)) throw new Error(`Link ${event.slug} is already in use`);
	events = events.map((e) => (e.slug === slug ? event : e));
	if (event.slug !== slug) {
		renameRoster(slug, event.slug);
		renames.set(slug, event.slug);
		renames.delete(event.slug);
	}
	emit();
}

export function deleteEvent(slug: string) {
	events = events.filter((event) => event.slug !== slug);
	removeRoster(slug);
	emit();
}

export interface EventSummary {
	event: DashboardEvent;
	stats: RosterStats;
}

export function useEventSummaries(): EventSummary[] {
	const all = useEvents();
	const rosters = useAllRosters();
	return useMemo(
		() =>
			all
				.map((event) => ({ event, stats: rosterStats(rosters[event.slug] ?? []) }))
				.sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt)),
		[all, rosters],
	);
}
