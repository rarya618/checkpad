// Events from Firestore (events/{eventId}), shared by every page. Super admins see every
// event; everyone else asks for their team's (firestore.rules). Pages address events by link
// (slug); a renamed event keeps its old links in slugs/{slug}, so pages and bookmarks follow it.
// The counts are kept by a function (functions/src/triggers.ts), so the Events page doesn't
// load every attendee list.
import { RESERVED_SLUGS, type CheckpadEvent } from '@checkpad/shared/events';
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	onSnapshot,
	query,
	serverTimestamp,
	Timestamp,
	updateDoc,
	where,
	writeBatch,
	type DocumentSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import { liveStore } from './live';
import { useMe, type Organiser } from './organisers';
import type { RosterStats } from './roster';
import { allTeams, WALK_IN_PREFIX } from './teams';

export interface DashboardEvent extends CheckpadEvent {
	/** The Firestore document ID; pages use the slug. */
	id: string;
	/** Every team that runs it, owner first; empty for an event no team runs, which only super admins see. */
	teamIds: string[];
	/** The team whose organisers choose its teams, hand it on and delete it; null with no team. */
	ownerTeamId: string | null;
	walkInTicketTitle: string;
	walkInVenue: string;
	/** Where to get a ticket, offered on the check-in page before check-in opens; '' for none. */
	ticketUrl: string;
	/** Walk-in tickets count up from here: CPWALKIN0001, CPWALKIN0002, … (older events: GDGWALKIN) */
	walkInTicketPrefix: string;
	/** Walk-in tickets given out so far; the next is one more. */
	walkInCounter: number;
	counts: { registered: number; checkedIn: number; walkIns: number };
	/** Who last opened or closed self check-in, and when (ISO). */
	selfCheckInChangedBy: string | null;
	selfCheckInChangedAt: string | null;
	/** Moved from the old check-in app, which didn't record who checked people in. */
	migrated: boolean;
	/** Registration questions its imports have seen → whether their answers are kept, so later imports follow the choice. */
	importedQuestions: Record<string, boolean>;
}

/** What New event and Event settings edit. */
export type EventInput = Pick<
	DashboardEvent,
	'slug' | 'name' | 'description' | 'startsAt' | 'endsAt' | 'timeZone' | 'teamIds' | 'ownerTeamId' | 'walkInTicketTitle' | 'walkInVenue' | 'ticketUrl' | 'selfWalkIns' | 'selfCheckInOpen'
>;

const iso = (value: Timestamp | null | undefined) => value?.toDate().toISOString() ?? null;

function toEvent(snap: DocumentSnapshot): DashboardEvent {
	const data = snap.data({ serverTimestamps: 'estimate' })!;
	return {
		id: snap.id,
		slug: data.slug,
		name: data.name,
		description: data.description,
		startsAt: iso(data.startsAt)!,
		endsAt: iso(data.endsAt)!,
		timeZone: data.timeZone,
		teamIds: data.teamIds ?? [],
		// Events made before owners existed have none: their first team owns them, as the
		// migration would have set, so saving settings keeps the team rather than dropping it
		ownerTeamId: data.ownerTeamId ?? data.teamIds?.[0] ?? null,
		selfWalkIns: data.selfWalkIns,
		selfCheckInOpen: data.status === 'open',
		walkInTicketTitle: data.walkInTicketTitle ?? '',
		walkInVenue: data.walkInVenue ?? '',
		ticketUrl: data.ticketUrl ?? '',
		walkInTicketPrefix: data.walkInTicketPrefix,
		walkInCounter: data.walkInCounter ?? 0,
		counts: data.counts ?? { registered: 0, checkedIn: 0, walkIns: 0 },
		selfCheckInChangedBy: data.statusChangedBy ?? null,
		selfCheckInChangedAt: iso(data.statusChangedAt),
		migrated: Boolean(data.legacyId),
		importedQuestions: data.importedQuestions ?? {},
	};
}

// Keyed "all" for super admins, or the team's ID
const store = liveStore<DashboardEvent[]>((key, emit, fail) => {
	const events = collection(db, 'events');
	return onSnapshot(
		key === 'all' ? events : query(events, where('teamIds', 'array-contains', key)),
		(snap) => emit(snap.docs.map(toEvent).sort((a, b) => b.startsAt.localeCompare(a.startsAt))),
		fail,
	);
});

const eventsKey = (me: Organiser | null | undefined) => (!me ? null : me.role === 'super-admin' ? 'all' : me.teamId);

/** The events `me` can see, newest first; undefined while loading. RequireOrganiser (App.tsx) waits for them. */
export function useEventsFor(me: Organiser | null | undefined) {
	return store.use(eventsKey(me));
}

export function useEvents() {
	return useEventsFor(useMe()) ?? [];
}

export function useEvent(slug: string | undefined) {
	return useEvents().find((event) => event.slug === slug);
}

/** Events already loaded, for code outside components. */
function loadedEvents() {
	return store.peek('all') ?? allTeams().flatMap((t) => store.peek(t.id) ?? []);
}

// Renames saved from this page, so it follows them before the server has the new link
const renames = new Map<string, string>();

/**
 * Where an event that used to live at `slug` lives now: a link, null if nowhere, or
 * undefined while that's being looked up (in slugs/{slug}, which keeps renamed events' links).
 */
export function useRenamedSlug(slug: string | undefined) {
	const events = useEvents();
	const [eventId, setEventId] = useState<string | null>();
	useEffect(() => {
		setEventId(undefined);
		if (!slug) return setEventId(null);
		let current = true;
		getDoc(doc(db, 'slugs', slug)).then(
			(snap) => current && setEventId(snap.exists() ? snap.get('eventId') : null),
			() => current && setEventId(null),
		);
		return () => {
			current = false;
		};
	}, [slug]);
	const local = slug && renames.get(slug);
	if (local && events.some((e) => e.slug === local)) return local;
	if (eventId === undefined) return undefined;
	return events.find((e) => e.id === eventId)?.slug ?? null;
}

/**
 * Whether one of the events you can see has this link, or the attendee site needs it for a
 * page. Other teams' links can't be seen; the rules refuse to take one, and saving says so.
 */
export function isSlugTaken(slug: string, except?: string) {
	return slug !== except && (RESERVED_SLUGS.has(slug) || loadedEvents().some((event) => event.slug === slug));
}

function eventFields(input: EventInput) {
	return {
		slug: input.slug,
		name: input.name,
		description: input.description,
		startsAt: Timestamp.fromDate(new Date(input.startsAt)),
		endsAt: Timestamp.fromDate(new Date(input.endsAt)),
		timeZone: input.timeZone,
		teamIds: input.teamIds,
		ownerTeamId: input.ownerTeamId,
		walkInTicketTitle: input.walkInTicketTitle,
		walkInVenue: input.walkInVenue,
		ticketUrl: input.ticketUrl,
		selfWalkIns: input.selfWalkIns,
		status: input.selfCheckInOpen ? 'open' : 'closed',
	};
}

/**
 * Saves a new event and claims its link, in one write. Walk-in tickets start with CP whatever the
 * team: older teams still store their own prefix (GDGWALKIN), which new events no longer copy.
 */
export function createEvent(input: EventInput) {
	const ref = doc(collection(db, 'events'));
	const batch = writeBatch(db);
	batch.set(ref, {
		...eventFields(input),
		counts: { registered: 0, checkedIn: 0, walkIns: 0 },
		walkInCounter: 0,
		walkInTicketPrefix: WALK_IN_PREFIX,
	});
	batch.set(doc(db, 'slugs', input.slug), { eventId: ref.id });
	return batch.commit();
}

/**
 * Saves Event settings. A new link is claimed in the same write; the old one stays the
 * event's. Opening or closing self check-in records `by` and when.
 */
export function updateEvent(event: DashboardEvent, input: EventInput, by: string) {
	const batch = writeBatch(db);
	const switched = input.selfCheckInOpen !== event.selfCheckInOpen;
	batch.update(doc(db, 'events', event.id), {
		...eventFields(input),
		...(switched && { statusChangedBy: by, statusChangedAt: serverTimestamp() }),
	});
	if (input.slug !== event.slug) {
		batch.set(doc(db, 'slugs', input.slug), { eventId: event.id });
		renames.set(event.slug, input.slug);
		renames.delete(input.slug);
	}
	return batch.commit();
}

/** Opens or closes self check-in from the Events page, recording `by` and when, as Event settings does. */
export function setSelfCheckIn(event: DashboardEvent, open: boolean, by: string) {
	return updateDoc(doc(db, 'events', event.id), {
		status: open ? 'open' : 'closed',
		statusChangedBy: by,
		statusChangedAt: serverTimestamp(),
	});
}

/** Deletes the event; a function deletes its attendees, prize draw and links after it. */
export function deleteEvent(event: DashboardEvent) {
	return deleteDoc(doc(db, 'events', event.id));
}

/** The Events page's numbers, from the counts the trigger keeps. Walk-ins are always checked in. */
export function countStats(event: DashboardEvent): RosterStats {
	const { registered, checkedIn, walkIns } = event.counts;
	return { total: registered, checkedIn, preRegistered: checkedIn - walkIns, walkIns, notArrived: registered - checkedIn };
}

export interface EventSummary {
	event: DashboardEvent;
	stats: RosterStats;
}

export function useEventSummaries(): EventSummary[] {
	return useEvents().map((event) => ({ event, stats: countStats(event) }));
}

/**
 * Whether `me` chooses the event's teams, hands it to another of them and deletes it: the owner
 * team's organisers, and super admins (as firestore.rules allows).
 */
export function ownsEvent(me: Pick<Organiser, 'role' | 'teamId'>, event: Pick<DashboardEvent, 'ownerTeamId'>) {
	return me.role === 'super-admin' || (me.role === 'organiser' && event.ownerTeamId !== null && me.teamId === event.ownerTeamId);
}

/** Remembers the registration questions the event's imports have seen and which of them are kept (Import attendees). */
export function setImportedQuestions(event: DashboardEvent, questions: Record<string, boolean>) {
	return updateDoc(doc(db, 'events', event.id), { importedQuestions: questions });
}

/**
 * The venues a team's events have been at, the most recently used first and each once, for the
 * event form's venue suggestions. `except` leaves out the event being edited.
 */
export function pastVenues(events: DashboardEvent[], teamId: string, except?: string) {
	const seen = new Set<string>();
	return [...events]
		.filter((e) => e.id !== except && e.teamIds.includes(teamId) && e.walkInVenue.trim())
		.sort((a, b) => b.startsAt.localeCompare(a.startsAt))
		.map((e) => e.walkInVenue.trim())
		.filter((v) => !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
}
