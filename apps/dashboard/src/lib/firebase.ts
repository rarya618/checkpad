// Firebase for the organiser dashboard (project checkpad-app). Config comes from
// .env.local (see .env.example). Database and sign-in UI aren't wired up yet:
// the database type is still undecided (docs/migration-plan.md).
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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
