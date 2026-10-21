// Attendees from Firestore (events/{eventId}/attendees/{ticket}), shared by every page that
// shows one event's list. The document ID is the ticket number. Checking in and undoing are
// plain writes, so they show at once and save when venue Wi-Fi comes back; adding a walk-in
// takes the next ticket number from the event, so it needs a connection.
import type { Attendee } from '@checkpad/shared/attendees';
import {
	collection,
	deleteDoc,
	doc,
	getDocs,
	onSnapshot,
	runTransaction,
	serverTimestamp,
	updateDoc,
	writeBatch,
	type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { myEmail } from './auth';
import type { ImportPlan } from './bevy';
import { useEvent, type DashboardEvent } from './events';
import { db } from './firebase';
import { liveStore } from './live';

export interface RosterAttendee extends Attendee {
	/** The ticket number: the document ID. */
	id: string;
	/** Ticket number from the registration platform, or GDGWALKIN0001… for walk-ins. */
	ticket: string | null;
	/** Bevy's ticket title, e.g. "General admission"; set by imports. */
	ticketType?: string;
	walkIn: boolean;
}

const EMPTY: RosterAttendee[] = [];
const attendees = (eventId: string) => collection(db, 'events', eventId, 'attendees');

function toAttendee(snap: QueryDocumentSnapshot): RosterAttendee {
	// A check-in still saving shows with this device's time rather than as not checked in
	const data = snap.data({ serverTimestamps: 'estimate' });
	return {
		id: snap.id,
		ticket: snap.id,
		firstName: data.firstName,
		lastName: data.lastName ?? '',
		email: data.email,
		checkedInAt: data.checkedInAt?.toDate() ?? null,
		...(data.ticketType && { ticketType: data.ticketType }),
		walkIn: data.source === 'walk-in',
	};
}

const store = liveStore<RosterAttendee[]>((eventId, emit, fail) => onSnapshot(attendees(eventId), (snap) => emit(snap.docs.map(toAttendee)), fail));

/** One event's attendees, by link; undefined while they load. */
export function useRosterLoading(eventSlug: string) {
	return store.use(useEvent(eventSlug)?.id ?? null);
}

/** One event's attendees, by link; empty while they load. */
export function useRoster(eventSlug: string) {
	return useRosterLoading(eventSlug) ?? EMPTY;
}

/** Fetched once, for an export from the Events page, which doesn't keep every list open. */
export async function loadRoster(event: DashboardEvent) {
	return (await getDocs(attendees(event.id))).docs.map(toAttendee);
}

// Several events' attendees, keyed by their IDs joined with commas
const manyStore = liveStore<Record<string, RosterAttendee[]>>((key, emit, fail) => {
	const ids = key.split(',');
	const rosters: Record<string, RosterAttendee[]> = {};
	const stops = ids.map((id) =>
		onSnapshot(
			attendees(id),
			(snap) => {
				rosters[id] = snap.docs.map(toAttendee);
				if (ids.every((i) => i in rosters)) emit({ ...rosters });
			},
			fail,
		),
	);
	return () => stops.forEach((stop) => stop());
});

/** Attendees of each of `events`, by event ID, for Analytics; empty while they load. */
export function useRosters(events: DashboardEvent[]) {
	const key = events.map((e) => e.id).sort().join(',');
	return manyStore.use(key || null) ?? {};
}

/** Checks someone in as the signed-in organiser, or undoes it. */
export function setCheckedIn(event: DashboardEvent, attendeeId: string, checkedIn: boolean) {
	const ref = doc(attendees(event.id), attendeeId);
	return updateDoc(ref, checkedIn ? { checkedInAt: serverTimestamp(), checkedInBy: myEmail() } : { checkedInAt: null, checkedInBy: null });
}

export function nextWalkInTicket(event: DashboardEvent) {
	return `${event.walkInTicketPrefix}${String(event.walkInCounter + 1).padStart(4, '0')}`;
}

/** Adds someone who didn't register, already checked in, with the event's next walk-in ticket. */
export async function addWalkIn(event: DashboardEvent, person: Pick<RosterAttendee, 'firstName' | 'lastName' | 'email'>) {
	const eventRef = doc(db, 'events', event.id);
	return runTransaction(db, async (tx) => {
		const counter: number = (await tx.get(eventRef)).get('walkInCounter') ?? 0;
		const ticket = nextWalkInTicket({ ...event, walkInCounter: counter });
		tx.update(eventRef, { walkInCounter: counter + 1 });
		tx.set(doc(attendees(event.id), ticket), {
			firstName: person.firstName,
			lastName: person.lastName,
			email: person.email.toLowerCase(),
			source: 'walk-in',
			checkedInAt: serverTimestamp(),
			checkedInBy: myEmail(),
		});
		return ticket;
	});
}

export function removeAttendee(event: DashboardEvent, attendeeId: string) {
	return deleteDoc(doc(attendees(event.id), attendeeId));
}

/**
 * Applies a Bevy import: adds new tickets as not arrived and updates names and ticket types.
 * Writes 500 at a time, so a large import isn't all or nothing; it's safe to run again.
 */
export async function importAttendees(event: DashboardEvent, roster: RosterAttendee[], plan: Pick<ImportPlan, 'added' | 'updated'>) {
	const ids = new Map(roster.map((a) => [a.id.toLowerCase(), a.id]));
	const writes = [
		...plan.added.map((row) => ({
			ref: doc(attendees(event.id), row.ticket),
			data: {
				firstName: row.firstName,
				lastName: row.lastName,
				email: row.email,
				source: 'bevy',
				checkedInAt: null,
				...(row.ticketType && { ticketType: row.ticketType }),
			},
			create: true,
		})),
		...plan.updated.map((row) => ({
			ref: doc(attendees(event.id), ids.get(row.ticket.toLowerCase()) ?? row.ticket),
			data: { firstName: row.firstName, lastName: row.lastName, ...(row.ticketType && { ticketType: row.ticketType }) },
			create: false,
		})),
	];
	for (let i = 0; i < writes.length; i += 500) {
		const batch = writeBatch(db);
		for (const { ref, data, create } of writes.slice(i, i + 500)) {
			if (create) batch.set(ref, data);
			else batch.update(ref, data);
		}
		await batch.commit();
	}
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
