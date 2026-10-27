// Firebase for the organiser dashboard (project checkpad-app). Config comes from .env.local
// (see .env.example). With VITE_USE_EMULATORS set it talks to the local Auth and Firestore
// emulators in demo-checkpad instead (CLAUDE.md), so development never touches production.
import { initializeApp } from 'firebase/app';
import {
	browserLocalPersistence,
	browserSessionPersistence,
	connectAuthEmulator,
	GoogleAuthProvider,
	indexedDBLocalPersistence,
	initializeAuth,
} from 'firebase/auth';
import {
	connectFirestoreEmulator,
	initializeFirestore,
	memoryLocalCache,
	persistentLocalCache,
	persistentMultipleTabManager,
} from 'firebase/firestore';

const env = import.meta.env;
export const usingEmulators = Boolean(env.VITE_USE_EMULATORS);

if (!usingEmulators && !env.VITE_FIREBASE_PROJECT_ID) {
	throw new Error('Missing Firebase config: copy apps/dashboard/.env.example to .env.local and fill it in.');
}

export const app = initializeApp(
	usingEmulators
		? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-checkpad' }
		: {
				apiKey: env.VITE_FIREBASE_API_KEY,
				authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
				projectId: env.VITE_FIREBASE_PROJECT_ID,
				storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
				messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
				appId: env.VITE_FIREBASE_APP_ID,
			},
);

// getAuth() without its popup helper: given one, Safari waits for its iframe (from the
// authDomain, a third party to Safari) before saying who's signed in, which held the dashboard
// on "Signing you in". The Google button brings it instead (auth.ts).
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence] });
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore (Standard edition, australia-southeast1) with an offline cache shared across
// tabs, so check-ins keep working on flaky venue Wi-Fi: they show at once and save when the
// connection comes back. Signing out clears it (auth.ts). Against the emulators the cache
// lives in memory, so reseeding never leaves stale data behind.
export const db = initializeFirestore(app, {
	localCache: usingEmulators ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (usingEmulators) {
	connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
	connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
