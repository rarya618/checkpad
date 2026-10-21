// Sign-in with Firebase Auth: Google, or a link emailed to the organiser (no passwords).
// Signing in doesn't grant anything by itself: access comes from the organiser list
// (organisers.ts), which the security rules check too.
import { FirebaseError } from 'firebase/app';
import {
	isSignInWithEmailLink,
	onAuthStateChanged,
	sendSignInLinkToEmail,
	signInWithEmailLink,
	signInWithPopup,
	signOut as firebaseSignOut,
	type User,
} from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { useSyncExternalStore } from 'react';
import { app, auth, db, googleProvider, usingEmulators } from './firebase';

export interface Session {
	email: string;
	name: string | null;
	method: 'google' | 'email';
}

function toSession(user: User | null): Session | null {
	if (!user?.email) return null;
	return {
		email: user.email.toLowerCase(),
		name: user.displayName,
		method: user.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'email',
	};
}

// Undefined until Firebase has restored any earlier sign-in
let session: Session | null | undefined;
const listeners = new Set<() => void>();
onAuthStateChanged(auth, (user) => {
	session = toSession(user);
	listeners.forEach((listener) => listener());
});

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Who is signed in: null if nobody, undefined while that's still being worked out. */
export function useSession() {
	return useSyncExternalStore(subscribe, () => session);
}

/** The signed-in organiser's email, lowercase, for recording who did what. */
export function myEmail() {
	const email = auth.currentUser?.email;
	if (!email) throw new Error('Not signed in');
	return email.toLowerCase();
}

/** Opens Google's account picker. Resolves with an error message, or null. */
export async function signInWithGoogle(): Promise<string | null> {
	try {
		await signInWithPopup(auth, googleProvider);
		return null;
	} catch (error) {
		const code = error instanceof FirebaseError ? error.code : '';
		if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
		if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site, or use an email link.';
		if (code === 'auth/account-exists-with-different-credential') return 'This email signs in with an email link. Use that instead.';
		return 'Couldn’t sign in with Google. Check your connection and try again.';
	}
}

// The email the link was sent to, so opening it on this device can finish signing in
const LINK_EMAIL = 'checkpad:sign-in-email';

/** Emails a one-time sign-in link that returns to `next`. Resolves with an error message, or null. */
export async function sendSignInLink(email: string, next: string): Promise<string | null> {
	const address = email.trim().toLowerCase();
	try {
		await sendSignInLinkToEmail(auth, address, {
			url: `${location.origin}/sign-in/link?${new URLSearchParams({ next })}`,
			handleCodeInApp: true,
		});
		localStorage.setItem(LINK_EMAIL, address);
		return null;
	} catch (error) {
		const code = error instanceof FirebaseError ? error.code : '';
		if (code === 'auth/invalid-email') return 'That doesn’t look like an email address.';
		if (code === 'auth/quota-exceeded' || code === 'auth/too-many-requests') return 'Too many sign-in emails for now. Try again later, or use Google.';
		return 'Couldn’t send the link. Check your connection and try again.';
	}
}

/**
 * Finishes signing in from the emailed link (the current URL). "expired" covers links that
 * were used already, are over an hour old, or were opened on another device, where we don't
 * know which email they were sent to.
 */
export function completeSignInLink(): Promise<'signed-in' | 'expired'> {
	// Once per link: a second try (React runs effects twice in development) would find it used
	const href = location.href;
	if (completing?.href !== href) completing = { href, result: finishSignInLink(href) };
	return completing.result;
}

let completing: { href: string; result: Promise<'signed-in' | 'expired'> } | undefined;

async function finishSignInLink(href: string): Promise<'signed-in' | 'expired'> {
	const email = localStorage.getItem(LINK_EMAIL);
	if (!email || !isSignInWithEmailLink(auth, href)) return 'expired';
	try {
		await signInWithEmailLink(auth, email, href);
		localStorage.removeItem(LINK_EMAIL);
		return 'signed-in';
	} catch {
		return 'expired';
	}
}

/**
 * The Auth emulator sends no email: it keeps the links, for the "Check your email" page to
 * open in development. Resolves with the newest link sent to `email`, or null.
 */
export async function emulatorSignInLink(email: string): Promise<string | null> {
	if (!usingEmulators) return null;
	const res = await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${app.options.projectId}/oobCodes`);
	const { oobCodes = [] }: { oobCodes?: { email: string; requestType: string; oobCode: string; oobLink: string }[] } = await res.json();
	const code = oobCodes.filter((c) => c.email === email.trim().toLowerCase() && c.requestType === 'EMAIL_SIGNIN').at(-1);
	if (!code) return null;
	// What the real email's link opens: the page we asked for, with the one-time code
	const link = new URL(new URL(code.oobLink).searchParams.get('continueUrl')!);
	link.searchParams.set('mode', 'signIn');
	link.searchParams.set('oobCode', code.oobCode);
	link.searchParams.set('apiKey', app.options.apiKey!);
	return link.pathname + link.search;
}

/** The email the last sign-in link went to from this browser, to offer a new one. */
export function lastLinkEmail() {
	return localStorage.getItem(LINK_EMAIL) ?? '';
}

/**
 * Signs out and clears this browser's offline copy of the attendee lists, since venue
 * laptops get shared. Firestore can't be used again on this page, so it reloads.
 */
export async function signOut() {
	await firebaseSignOut(auth);
	await terminate(db);
	await clearIndexedDbPersistence(db).catch(() => {});
	location.assign('/sign-in');
}
