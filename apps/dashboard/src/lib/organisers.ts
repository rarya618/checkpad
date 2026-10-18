// In-memory organiser store (Figma "Organisers"), like events.ts and roster.ts.
// Swap for Firebase Auth users and their roles later.
import { useSyncExternalStore } from 'react';
import { currentUser } from './mock';

export type Role = 'super-admin' | 'organiser' | 'team-member';

export const roles: { id: Role; label: string; description: string }[] = [
	{ id: 'super-admin', label: 'Super admin', description: 'Every event and team, and manages organisers' },
	{ id: 'organiser', label: 'Organiser', description: 'Creates and edits their team’s events' },
	{ id: 'team-member', label: 'Team member', description: 'Checks people in at their team’s events' },
];

export const roleLabel = (role: Role) => roles.find((r) => r.id === role)!.label;

export interface Organiser {
	id: string;
	/** Null until they first sign in. */
	name: string | null;
	email: string;
	role: Role;
	/** Team name; super admins see every team, so theirs is null. */
	team: string | null;
	/** Invited but hasn't signed in yet. */
	invited: boolean;
}

// The people in the Figma table.
let organisers: Organiser[] = [
	{ id: 'o1', name: currentUser.name, email: 'russal@example.com', role: 'super-admin', team: null, invited: false },
	{ id: 'o2', name: 'Priya Natarajan', email: 'priya@example.com', role: 'organiser', team: 'GDG Sydney', invited: false },
	{ id: 'o3', name: 'Tom Becker', email: 'tom@example.com', role: 'team-member', team: 'GDG Sydney', invited: false },
	{ id: 'o4', name: 'Mei Chen', email: 'mei@example.com', role: 'team-member', team: 'GDG Sydney', invited: false },
	{ id: 'o5', name: null, email: 'sam@example.com', role: 'organiser', team: 'GDG Sydney', invited: true },
];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function set(next: Organiser[]) {
	organisers = next;
	listeners.forEach((listener) => listener());
}

export function useOrganisers() {
	return useSyncExternalStore(subscribe, () => organisers);
}

export function isOrganiser(email: string) {
	return organisers.some((o) => o.email.toLowerCase() === email.trim().toLowerCase());
}

/** Adds someone as invited; the real app emails them a sign-in invite. */
export function inviteOrganiser(email: string, role: Role, team: string | null) {
	set([...organisers, { id: `o${Date.now()}`, name: null, email: email.trim(), role, team: role === 'super-admin' ? null : team, invited: true }]);
}

/** First sign-in: no longer "Invited". */
export function markSignedIn(email: string) {
	if (organisers.some((o) => o.invited && o.email.toLowerCase() === email.toLowerCase())) {
		set(organisers.map((o) => (o.email.toLowerCase() === email.toLowerCase() ? { ...o, invited: false } : o)));
	}
}

export function updateOrganiser(id: string, changes: Pick<Organiser, 'role' | 'team'>) {
	set(organisers.map((o) => (o.id === id ? { ...o, ...changes, team: changes.role === 'super-admin' ? null : changes.team } : o)));
}

export function removeOrganiser(id: string) {
	set(organisers.filter((o) => o.id !== id));
}

/** Manage team's Save: team renames, members taken off the team, and new invites in one go. */
export function saveTeamMembers(previousName: string | null, name: string, removedIds: string[], invites: { email: string; role: Role }[]) {
	set([
		...organisers
			.filter((o) => !removedIds.includes(o.id))
			.map((o) => (previousName !== null && o.team === previousName ? { ...o, team: name } : o)),
		...invites.map((invite, i) => ({ id: `o${Date.now()}-${i}`, name: null, email: invite.email, role: invite.role, team: name, invited: true })),
	]);
}

export function initialsOf(o: Organiser) {
	if (!o.name) return o.email.slice(0, 2).toUpperCase();
	return o.name
		.split(/\s+/)
		.map((part) => part[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}
