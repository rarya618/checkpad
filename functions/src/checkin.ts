// What the attendee site can ask for. Every answer carries only what the attendee screens
// show: never the attendee list, and never anyone's email or last name.
import type { ApiErrorCode, CheckedIn, CheckInResponse, PublicEvent, TeamTarget, WalkInResponse } from '@checkpad/shared/api';
import {
	Timestamp,
	type DocumentReference,
	type Firestore,
	type QuerySnapshot,
	type Transaction,
} from 'firebase-admin/firestore';
import type { AttendeeDoc, EventDoc, TeamDoc } from './model.js';

/** A failure the attendee site handles, sent back as { error: code } with this status. */
export class ApiFailure extends Error {
	constructor(
		readonly code: ApiErrorCode,
		readonly status: number,
	) {
		super(code);
	}
}

// Same pattern as the forms in apps/web
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;

export function parseEmail(value: unknown) {
	const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if (!EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) throw new ApiFailure('invalid', 400);
	return email;
}

function parseName(value: unknown) {
	const name = typeof value === 'string' ? value.trim() : '';
	if (!name || name.length > MAX_NAME_LENGTH) throw new ApiFailure('invalid', 400);
	return name;
}

async function findEvent(db: Firestore, slug: string) {
	const snap = await db.collection('events').where('slug', '==', slug).limit(1).get();
	if (snap.empty) throw new ApiFailure('not-found', 404);
	const doc = snap.docs[0];
	return { ref: doc.ref as DocumentReference<EventDoc>, event: doc.data() as EventDoc };
}

function requireOpen(event: EventDoc) {
	if (event.status !== 'open') throw new ApiFailure('closed', 409);
}

function toPublicEvent(event: EventDoc): PublicEvent {
	return {
		slug: event.slug,
		name: event.name,
		description: event.description,
		startsAt: event.startsAt.toDate().toISOString(),
		endsAt: event.endsAt.toDate().toISOString(),
		timeZone: event.timeZone,
		open: event.status === 'open',
		selfWalkIns: event.selfWalkIns,
	};
}

export async function getEvent(db: Firestore, slug: string): Promise<PublicEvent> {
	return toPublicEvent((await findEvent(db, slug)).event);
}

const attendeesWithEmail = (eventRef: DocumentReference<EventDoc>, email: string) =>
	eventRef.collection('attendees').where('email', '==', email);

/**
 * Checks in one of the tickets registered to this email, within a transaction whose reads
 * are done. The event's counts follow by themselves (countAttendees in triggers.ts). If any of them is already checked in, that's the answer, so a double tap or a
 * refresh never uses up a second ticket. Returns null when the email isn't on the list.
 */
function checkInFrom(tx: Transaction, matches: QuerySnapshot): CheckedIn | null {
	if (matches.empty) return null;
	const docs = [...matches.docs].sort((a, b) => a.id.localeCompare(b.id));
	const used = docs.find((d) => (d.data() as AttendeeDoc).checkedInAt);
	if (used) {
		const a = used.data() as AttendeeDoc;
		return { status: 'checked-in', firstName: a.firstName, ticket: used.id, checkedInAt: a.checkedInAt!.toDate().toISOString(), alreadyCheckedIn: true };
	}
	const doc = docs[0];
	const now = Timestamp.now();
	tx.update(doc.ref, { checkedInAt: now });
	return { status: 'checked-in', firstName: (doc.data() as AttendeeDoc).firstName, ticket: doc.id, checkedInAt: now.toDate().toISOString(), alreadyCheckedIn: false };
}

export async function checkIn(db: Firestore, slug: string, body: { email?: unknown }): Promise<CheckInResponse> {
	const email = parseEmail(body.email);
	const { ref, event } = await findEvent(db, slug);
	requireOpen(event);
	const result = await db.runTransaction(async (tx) => checkInFrom(tx, await tx.get(attendeesWithEmail(ref, email))));
	return result ?? { status: 'not-registered', selfWalkIns: event.selfWalkIns };
}

/**
 * Adds someone who isn't on the list, already checked in, with the event's next walk-in
 * ticket. The counter is read and bumped in one transaction, so two phones adding walk-ins
 * at the same moment can't get the same number.
 */
export async function walkIn(db: Firestore, slug: string, body: { email?: unknown; firstName?: unknown; lastName?: unknown }): Promise<WalkInResponse> {
	const email = parseEmail(body.email);
	const firstName = parseName(body.firstName);
	const lastName = parseName(body.lastName);
	const { ref } = await findEvent(db, slug);
	return db.runTransaction(async (tx) => {
		// All reads before any writes, as transactions require
		const [eventSnap, matches] = await Promise.all([tx.get(ref), tx.get(attendeesWithEmail(ref, email))]);
		const event = eventSnap.data() as EventDoc;
		requireOpen(event);
		if (!event.selfWalkIns) throw new ApiFailure('walk-ins-off', 403);
		// Registered after all (or added by staff a moment ago): check them in under their own ticket
		const existing = checkInFrom(tx, matches);
		if (existing) return existing;

		const number = (event.walkInCounter ?? 0) + 1;
		const ticket = `${event.walkInTicketPrefix}${String(number).padStart(4, '0')}`;
		const now = Timestamp.now();
		const attendee: AttendeeDoc = { firstName, lastName, email, source: 'walk-in', checkedInAt: now };
		tx.create(ref.collection('attendees').doc(ticket), attendee);
		tx.update(ref, { walkInCounter: number });
		return { status: 'checked-in', firstName, ticket, checkedInAt: now.toDate().toISOString(), alreadyCheckedIn: false };
	});
}

/**
 * Where a team's permanent link (checkpad.app/team/<slug>) should go: its event that's open
 * for check-in (the latest, if several), or else its next event that hasn't finished.
 * Reads all the team's events, which is fine at a meetup's handful per year.
 */
export async function teamTarget(db: Firestore, slug: string, now = new Date()): Promise<TeamTarget> {
	const teams = await db.collection('teams').where('slug', '==', slug).limit(1).get();
	if (teams.empty) throw new ApiFailure('not-found', 404);
	const teamDoc = teams.docs[0];
	const team = teamDoc.data() as TeamDoc;
	const events = (await db.collection('events').where('teamIds', 'array-contains', teamDoc.id).get()).docs.map((d) => d.data() as EventDoc);
	const byStart = (a: EventDoc, b: EventDoc) => a.startsAt.toMillis() - b.startsAt.toMillis();
	const open = events.filter((e) => e.status === 'open').sort(byStart).at(-1);
	const next = events.filter((e) => e.endsAt.toDate() > now).sort(byStart)[0];
	return { team: { slug: team.slug, name: team.name }, eventSlug: (open ?? next)?.slug ?? null };
}
