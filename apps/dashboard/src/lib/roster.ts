// Attendees from Firestore (events/{eventId}/attendees/{ticket}), shared by every page that
// shows one event's list. The document ID is the ticket number. Checking in and undoing are
// plain writes, so they show at once and save when venue Wi-Fi comes back; adding a walk-in
// takes the next ticket number from the event, so it needs a connection.
import type { Attendee } from '@checkpad/shared/attendees';
import {
	collection,
	deleteDoc,
	deleteField,
	doc,
	getDocs,
	onSnapshot,
	runTransaction,
	serverTimestamp,
	Timestamp,
	updateDoc,
	writeBatch,
	type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { myEmail } from './auth';
import type { ImportPlan } from './attendeeImport';
import { useEvent, type DashboardEvent } from './events';
import { db } from './firebase';
import { liveStore } from './live';

export interface RosterAttendee extends Attendee {
	/** The ticket number: the document ID. */
	id: string;
	/** Ticket number from the registration platform, or CPWALKIN0001… for walk-ins. */
	ticket: string | null;
	/** The platform's ticket type, e.g. "General admission"; set by imports. */
	ticketType?: string;
	/** Answers to the event's registration questions, question → answer; set by imports. */
	answers?: Record<string, string>;
	/** When they registered on the platform; set by imports whose file has a date. */
	registeredAt?: Date;
	walkIn: boolean;
	/** Walk-ins staff added: who added them. Self walk-ins from the check-in page have none. */
	addedBy?: string;
	/** The organiser who checked them in from the dashboard; none when they checked themselves in. */
	checkedInBy?: string;
	/** Checked in on the registration platform, and brought in by an import: nobody knows how. */
	checkInImported?: boolean;
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
		...(data.answers && { answers: data.answers }),
		...(data.registeredAt && { registeredAt: data.registeredAt.toDate() }),
		walkIn: data.source === 'walk-in',
		...(data.source === 'walk-in' && data.checkedInBy && { addedBy: data.checkedInBy }),
		...(data.checkedInAt && data.checkedInBy && { checkedInBy: data.checkedInBy }),
		...(data.checkedInAt && data.checkInImported && { checkInImported: true }),
	};
}

const store = liveStore<RosterAttendee[]>((eventId, emit, fail) => onSnapshot(attendees(eventId), (snap) => emit(snap.docs.map(toAttendee)), fail));

/** One event's attendees, by link; undefined while they load. */
export function useRosterLoading(eventSlug: string) {
	return store.use(useEvent(eventSlug)?.id ?? null);
}

/** Starts loading an event's attendees as its row is pressed, so its page is ready sooner. */
export function preloadRoster(eventId: string) {
	store.warm(eventId);
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

/** Checks someone in as the signed-in organiser, or undoes it. Either way it's no longer an imported check-in. */
export function setCheckedIn(event: DashboardEvent, attendeeId: string, checkedIn: boolean) {
	const ref = doc(attendees(event.id), attendeeId);
	const change = checkedIn ? { checkedInAt: serverTimestamp(), checkedInBy: myEmail() } : { checkedInAt: null, checkedInBy: null };
	return updateDoc(ref, { ...change, checkInImported: deleteField() });
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
 * Applies an import: adds new tickets as not arrived, stamped with who imported them and when,
 * and updates names, ticket types, answers and registration dates. Saves each ticket's payment
 * apart (events/{eventId}/payments/{ticket}), replacing the last import's, for organisers only.
 * Writes 500 at a time, so a large import isn't all or nothing; it's safe to run again.
 * `checkIns` checks people in at the platform's times: new people as they're added, and people
 * already on the list one by one afterwards, so anyone checked in here meanwhile stays as they are.
 */
export async function importAttendees(
	event: DashboardEvent,
	roster: RosterAttendee[],
	plan: Pick<ImportPlan, 'source' | 'questions' | 'added' | 'updated' | 'payments'>,
	checkIns: ImportPlan['checkIns'] = [],
) {
	const ids = new Map(roster.map((a) => [a.id.toLowerCase(), a.id]));
	const arrived = new Map(checkIns.map((c) => [c.ticket.toLowerCase(), c.at]));
	const imported = (ticket: string) => {
		const at = arrived.get(ticket.toLowerCase());
		return at ? { checkedInAt: Timestamp.fromDate(at), checkInImported: true } : { checkedInAt: null };
	};
	const added = new Set(plan.added.map((row) => row.ticket.toLowerCase()));
	const writes = [
		...plan.added.map((row) => ({
			ref: doc(attendees(event.id), row.ticket),
			data: {
				firstName: row.firstName,
				lastName: row.lastName,
				email: row.email,
				source: plan.source,
				...imported(row.ticket),
				importedAt: serverTimestamp(),
				importedBy: myEmail(),
				...(row.ticketType && { ticketType: row.ticketType }),
				...(Object.keys(row.answers).length && { answers: row.answers }),
				...(row.registeredAt && { registeredAt: Timestamp.fromDate(row.registeredAt) }),
			},
			create: true,
		})),
		...plan.updated.map((row) => ({
			ref: doc(attendees(event.id), ids.get(row.ticket.toLowerCase()) ?? row.ticket),
			data: {
				firstName: row.firstName,
				lastName: row.lastName,
				...(row.ticketType && { ticketType: row.ticketType }),
				// A file with questions replaces the answers; one without leaves them be
				...(plan.questions.length && { answers: Object.keys(row.answers).length ? row.answers : deleteField() }),
				...(row.registeredAt && { registeredAt: Timestamp.fromDate(row.registeredAt) }),
			},
			create: false,
		})),
		...plan.payments.map(({ ticket, payment }) => ({
			ref: doc(db, 'events', event.id, 'payments', ids.get(ticket.toLowerCase()) ?? ticket),
			data: { source: plan.source, ...payment, importedAt: serverTimestamp(), importedBy: myEmail() },
			create: true,
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
	// The rules turn one down if they were checked in here since the file was read
	const existing = checkIns.filter((c) => !added.has(c.ticket.toLowerCase()));
	await Promise.allSettled(
		existing.map((c) => updateDoc(doc(attendees(event.id), ids.get(c.ticket.toLowerCase()) ?? c.ticket), { checkedInAt: Timestamp.fromDate(c.at), checkInImported: true })),
	);
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
