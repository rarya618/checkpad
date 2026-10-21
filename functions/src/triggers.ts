// Upkeep the dashboard can't do from a browser: the security rules don't let browsers write
// an event's counts, or delete everything under it.
import { FieldValue, Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';

// Firestore's "not found" and "already exists" error codes
const NOT_FOUND = 5;
const ALREADY_EXISTS = 6;
const DAY = 24 * 60 * 60 * 1000;

function tally(attendee: DocumentData | undefined) {
	return {
		registered: attendee ? 1 : 0,
		checkedIn: attendee?.checkedInAt ? 1 : 0,
		walkIns: attendee?.source === 'walk-in' ? 1 : 0,
	};
}

/**
 * Moves an event's counts by what one attendee write changed, whoever made it: the check-in
 * API, or the dashboard's plain writes (which queue up offline on flaky venue Wi-Fi). Checking
 * in someone already checked in changes nothing, so two devices count them once.
 *
 * Increments don't read the event, so a rush of check-ins never waits on a lock. Triggers can
 * be delivered twice, so each delivery records itself (triggerRuns/{id}) in the same batch;
 * a repeat fails to create it and changes nothing. A TTL policy deletes the records.
 */
export async function countChange(db: Firestore, run: { id: string; eventId: string; before?: DocumentData; after?: DocumentData }) {
	const before = tally(run.before);
	const after = tally(run.after);
	const change = {
		'counts.registered': after.registered - before.registered,
		'counts.checkedIn': after.checkedIn - before.checkedIn,
		'counts.walkIns': after.walkIns - before.walkIns,
	};
	const moved = Object.entries(change).filter(([, n]) => n !== 0);
	if (moved.length === 0) return;

	const batch = db.batch();
	batch.create(db.doc(`triggerRuns/${run.id}`), { expireAt: Timestamp.fromMillis(Date.now() + DAY) });
	batch.update(db.doc(`events/${run.eventId}`), Object.fromEntries(moved.map(([field, n]) => [field, FieldValue.increment(n)])));
	try {
		await batch.commit();
	} catch (error) {
		const code = (error as { code?: number }).code;
		// Delivered twice, or the event is being deleted (cleanUpEvent)
		if (code === ALREADY_EXISTS || code === NOT_FOUND) return;
		throw error;
	}
}

/** After an event is deleted: its attendees, prize draw results and links go too. */
export async function cleanUpEvent(db: Firestore, eventId: string) {
	const ref = db.doc(`events/${eventId}`);
	// Written again since (only ever in tests and seeding, which reuse IDs): leave it be
	if ((await ref.get()).exists) return;
	await Promise.all([db.recursiveDelete(ref.collection('attendees')), db.recursiveDelete(ref.collection('draw'))]);
	const slugs = await db.collection('slugs').where('eventId', '==', eventId).get();
	const batch = db.batch();
	for (const slug of slugs.docs) batch.delete(slug.ref);
	await batch.commit();
}
