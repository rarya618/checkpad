// The marketing site's waitlist (waitlist/{entryId}, apps/web/src/lib/waitlist.ts). Only super
// admins read it (firestore.rules). Signing up twice adds a second entry, so the list groups
// entries by email.
import { collection, doc, onSnapshot, writeBatch, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { liveStore } from './live';

export interface WaitlistSignup {
	email: string;
	/** ISO; the first time they signed up. */
	signedUpAt: string;
	/** Their entries: more than one if they signed up again. */
	entryIds: string[];
}

function group(docs: QueryDocumentSnapshot[]) {
	const byEmail = new Map<string, WaitlistSignup>();
	for (const d of docs) {
		const email: string = d.get('email');
		const at = d.get('createdAt')?.toDate().toISOString() ?? new Date().toISOString();
		const signup = byEmail.get(email);
		if (!signup) byEmail.set(email, { email, signedUpAt: at, entryIds: [d.id] });
		else {
			signup.entryIds.push(d.id);
			if (at < signup.signedUpAt) signup.signedUpAt = at;
		}
	}
	return [...byEmail.values()].sort((a, b) => b.signedUpAt.localeCompare(a.signedUpAt));
}

const store = liveStore<WaitlistSignup[]>((_key, emit, fail) => onSnapshot(collection(db, 'waitlist'), (snap) => emit(group(snap.docs)), fail));

/**
 * Everyone on the waitlist, newest first (undefined while loading), and why it couldn't load.
 * Super admins only. Doesn't throw, so a failure shows in the Waitlist tab, not over the page.
 */
export function useWaitlist() {
	const { value, error } = store.useResult('all');
	return { signups: value, error };
}

/** Takes someone off the list: every entry for their email. */
export function removeFromWaitlist(signup: WaitlistSignup) {
	const batch = writeBatch(db);
	for (const id of signup.entryIds) batch.delete(doc(db, 'waitlist', id));
	return batch.commit();
}
