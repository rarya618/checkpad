// Product waitlist, stored in Firestore (checkpad-app) in the waitlist collection. The
// rules (firestore.rules) only let a browser add an entry, so the list can't be read
// from the site; read it in the Firebase console. Signing up twice adds two entries.
// Config comes from .env.local (see .env.example).
import type { Firestore } from 'firebase/firestore/lite';

// Must match the pattern in firestore.rules, or the write is rejected.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 254;

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

let db: Promise<Firestore> | undefined;

// Firebase loads on the first signup rather than with the page. Firestore Lite is
// enough for a single write and is much smaller than the full SDK.
function getDb() {
	return (db ??= (async () => {
		const env = import.meta.env;
		if (!env.PUBLIC_FIREBASE_PROJECT_ID) {
			throw new Error('Missing Firebase config: copy apps/web/.env.example to .env.local and fill it in.');
		}
		const [{ initializeApp }, { getFirestore }] = await Promise.all([import('firebase/app'), import('firebase/firestore/lite')]);
		const app = initializeApp({
			apiKey: env.PUBLIC_FIREBASE_API_KEY,
			authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
			projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
			appId: env.PUBLIC_FIREBASE_APP_ID,
		});
		return getFirestore(app);
	})());
}

export async function joinWaitlist(email: string): Promise<void> {
	const [firestore, { addDoc, collection, serverTimestamp }] = await Promise.all([getDb(), import('firebase/firestore/lite')]);
	await addDoc(collection(firestore, 'waitlist'), { email: normaliseEmail(email), createdAt: serverTimestamp() });
}
