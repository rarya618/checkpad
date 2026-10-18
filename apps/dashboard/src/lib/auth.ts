// Mock sign-in until Firebase Auth (Google and email link) is set up. Starts signed in as
// the super admin so the dashboard opens as before; Sign out shows Figma "Sign in".
import { useSyncExternalStore } from 'react';
import { markSignedIn, useOrganisers } from './organisers';

export interface Session {
	email: string;
	name: string | null;
	method: 'google' | 'email';
}

let session: Session | null = { email: 'russal@example.com', name: 'Russal Arya', method: 'google' };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function set(next: Session | null) {
	session = next;
	listeners.forEach((listener) => listener());
}

export function useSession() {
	return useSyncExternalStore(subscribe, () => session);
}

/** Stands in for Google's account picker: signs in as the super admin. */
export function signInWithGoogle() {
	set({ email: 'russal@example.com', name: 'Russal Arya', method: 'google' });
}

/** Opening the emailed link. The real link carries a one-time token from Firebase. */
export function signInWithEmailLink(email: string) {
	set({ email: email.trim().toLowerCase(), name: null, method: 'email' });
	markSignedIn(email.trim());
}

export function signOut() {
	set(null);
}

/** The signed-in organiser's record, for the sidebar and account menu. */
export function useCurrentOrganiser() {
	const current = useSession();
	const all = useOrganisers();
	return current ? all.find((o) => o.email.toLowerCase() === current.email) : undefined;
}
