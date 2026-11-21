// Sign-in with Firebase Auth: Google, or an email to the organiser with a code to type and a link
// to open (no passwords). The email is our own (functions/src/organisers.ts), not Firebase's.
// Signing in doesn't grant anything by itself: access comes from the organiser list
// (organisers.ts), which the security rules check too.
import { FirebaseError } from 'firebase/app';
import {
	browserPopupRedirectResolver,
	getRedirectResult,
	isSignInWithEmailLink,
	onAuthStateChanged,
	signInWithCustomToken,
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

/**
 * Loads the popup helper's iframe while the sign-in page shows, so the Google button opens its
 * window straight away: Safari blocks a popup that opens long after the click. Nothing else
 * signs in through it, so the rest of the dashboard never waits for it (firebase.ts).
 */
export function prepareGoogleSignIn() {
	getRedirectResult(auth, browserPopupRedirectResolver).catch(() => {});
}

/** Opens Google's account picker. Resolves with an error message, or null. */
export async function signInWithGoogle(): Promise<string | null> {
	try {
		await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
		return null;
	} catch (error) {
		const code = error instanceof FirebaseError ? error.code : '';
		if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
		if (code === 'auth/popup-blocked') return 'Your browser blocked the Google sign-in window. Allow pop-ups for this site, or sign in with your email.';
		if (code === 'auth/account-exists-with-different-credential') return 'This email signs in with an emailed code. Use that instead.';
		return 'Couldn’t sign in with Google. Check your connection and try again.';
	}
}

// The email the link was sent to, so opening it on this device can finish signing in
const LINK_EMAIL = 'checkpad:sign-in-email';

/**
 * Emails a sign-in code, and a one-time link that returns to `next`, through the check-in API
 * (functions/src/organisers.ts), which sends Checkpad's own email and only to organisers.
 * Resolves with an error message, or null.
 */
export async function sendSignInLink(email: string, next: string): Promise<string | null> {
	const address = email.trim().toLowerCase();
	try {
		const res = await fetch('/api/auth/sign-in-link', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email: address, next }),
		});
		if (res.status === 400) return 'That doesn’t look like an email address.';
		if (res.status === 429) return 'Too many sign-in emails for now. Try again in a few minutes, or use Google.';
		if (!res.ok) throw new Error(`Sign-in link: HTTP ${res.status}`);
		localStorage.setItem(LINK_EMAIL, address);
		return null;
	} catch {
		return 'Couldn’t send the link. Check your connection and try again.';
	}
}

/**
 * Signs in with the six-digit code from the email, which works on any device: the API swaps it
 * for a token (functions/src/organisers.ts). Resolves with an error message, or null.
 */
export async function signInWithCode(email: string, code: string): Promise<string | null> {
	const address = email.trim().toLowerCase();
	try {
		const res = await fetch('/api/auth/sign-in-code', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email: address, code }),
		});
		if (res.status === 400) return 'That code isn’t right, or it’s expired. Check the latest email, or send a new code.';
		if (res.status === 429) return 'Too many tries for now. Wait a few minutes, or use Google.';
		if (!res.ok) throw new Error(`Sign-in code: HTTP ${res.status}`);
		const { token } = (await res.json()) as { token: string };
		await signInWithCustomToken(auth, token);
		localStorage.removeItem(LINK_EMAIL);
		return null;
	} catch {
		return 'Couldn’t sign in. Check your connection and try again.';
	}
}

/**
 * Finishes signing in from the emailed link (the current URL). "other-device" is a link opened
 * somewhere other than where it was asked for, which can't sign in there: the page asks for the
 * same email's code instead. "expired" covers links that were used already or are over an hour old.
 */
export type LinkResult = 'signed-in' | 'other-device' | 'expired';

export function completeSignInLink(): Promise<LinkResult> {
	// Once per link: a second try (React runs effects twice in development) would find it used
	const href = location.href;
	if (completing?.href !== href) completing = { href, result: finishSignInLink(href) };
	return completing.result;
}

let completing: { href: string; result: Promise<LinkResult> } | undefined;

async function finishSignInLink(href: string): Promise<LinkResult> {
	if (!isSignInWithEmailLink(auth, href)) return 'expired';
	// Which address it went to, from the link (functions/src/organisers.ts), and the one this
	// browser last asked for. The link's address is only compared, never signed in with, so a
	// link from someone else's email can't sign this browser in to their account.
	const sentTo = new URL(href).searchParams.get('email')?.toLowerCase();
	const email = localStorage.getItem(LINK_EMAIL);
	if (!email || (sentTo && sentTo !== email)) return 'other-device';
	try {
		await signInWithEmailLink(auth, email, href);
		localStorage.removeItem(LINK_EMAIL);
		return 'signed-in';
	} catch {
		return 'expired';
	}
}

/**
 * The emulators send no email: the Functions emulator keeps each one in emulatorOutbox, which the
 * Firestore emulator lets us read as its owner. Resolves with the newest code sent to `email`, or null.
 */
export async function emulatorSignInCode(email: string): Promise<string | null> {
	if (!usingEmulators) return null;
	const res = await fetch(`http://127.0.0.1:8080/v1/projects/${app.options.projectId}/databases/(default)/documents/emulatorOutbox`, {
		headers: { authorization: 'Bearer owner' },
	});
	const { documents = [] }: { documents?: { fields: { to: { stringValue: string }; template: { stringValue: string }; at: { timestampValue: string }; variables: { mapValue: { fields: { CODE?: { stringValue: string } } } } } }[] } =
		await res.json();
	const newest = documents
		.filter((d) => d.fields.to.stringValue === email.trim().toLowerCase() && d.fields.template.stringValue === 'sign-in')
		.sort((a, b) => b.fields.at.timestampValue.localeCompare(a.fields.at.timestampValue))[0];
	return newest?.fields.variables.mapValue.fields.CODE?.stringValue ?? null;
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

/** The address the last sign-in email went to from this browser, to offer a new one. */
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
