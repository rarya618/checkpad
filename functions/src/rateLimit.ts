// Slows down anyone guessing emails to find out who registered. Counts check-in and walk-in
// attempts per network per event in ten-minute windows.
//
// The limit is generous on purpose: a whole room on the venue's Wi-Fi shares one IP address,
// so a tight limit would lock out real attendees. The old app's busiest event checked in 23
// people in one minute, and a walk-in takes two attempts (the lookup, then the walk-in), so
// 500 leaves room for typos, retries and bigger events. It stops a script trying thousands
// of emails, not a person trying a few. Counters live in rateLimits/{hash}, which a Firestore
// TTL policy on expireAt deletes (firestore.indexes.json); the hash keeps raw IPs out of
// the database.
import { createHash } from 'node:crypto';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';

const WINDOW_MS = 10 * 60 * 1000;

/** Attempts allowed per network, per event, per window. Override with CHECKIN_RATE_LIMIT. */
export const rateLimit = () => Number(process.env.CHECKIN_RATE_LIMIT) || 500;

/**
 * Counts one attempt by `who` (an IP address, or an email for sign-in links) at `what` (an event
 * link, or "sign-in"), and says whether it's within `limit` for this window.
 */
export async function allowAttempt(db: Firestore, who: string, what: string, now = Date.now(), limit = rateLimit()) {
	const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
	const id = createHash('sha256').update(`${who}|${what}|${windowStart}`).digest('hex');
	const ref = db.collection('rateLimits').doc(id);
	return db.runTransaction(async (tx) => {
		const count = ((await tx.get(ref)).get('count') ?? 0) + 1;
		tx.set(ref, { count, expireAt: Timestamp.fromMillis(windowStart + 2 * WINDOW_MS) });
		return count <= limit;
	});
}
