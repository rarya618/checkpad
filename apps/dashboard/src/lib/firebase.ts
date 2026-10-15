// Firebase for the organiser dashboard (project checkpad-app). Config comes from
// .env.local (see .env.example). Nothing uses it yet: the pages still run on mock
// data, and sign-in isn't designed.
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const env = import.meta.env;

if (!env.VITE_FIREBASE_PROJECT_ID) {
	throw new Error('Missing Firebase config: copy apps/dashboard/.env.example to .env.local and fill it in.');
}

export const app = initializeApp({
	apiKey: env.VITE_FIREBASE_API_KEY,
	authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore (Standard edition, australia-southeast1) with an offline cache shared
// across tabs, so check-ins at the door keep working on flaky venue Wi-Fi.
export const db = initializeFirestore(app, {
	localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
