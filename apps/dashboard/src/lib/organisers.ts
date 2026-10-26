// Organisers from Firestore (admins/{email}, Figma "Organisers"). Who can sign in and what they
// can do; the security rules check the same documents, so hiding a button here is only a
// convenience. Super admins see everyone, others only their own team.
import { FirebaseError } from 'firebase/app';
import {
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
	writeBatch,
	type DocumentSnapshot,
} from 'firebase/firestore';
import { useSession } from './auth';
import { auth, db } from './firebase';
import { liveStore } from './live';
import { newTeamRef, teamData, teamName, type Team } from './teams';

export type Role = 'super-admin' | 'organiser' | 'team-member';

export const roles: { id: Role; label: string; description: string }[] = [
	{ id: 'super-admin', label: 'Super admin', description: 'Every event and team, and manages organisers' },
	{ id: 'organiser', label: 'Organiser', description: 'Creates and edits their team’s events' },
	{ id: 'team-member', label: 'Team member', description: 'Checks people in at their team’s events' },
];

export const roleLabel = (role: Role) => roles.find((r) => r.id === role)!.label;

export interface Organiser {
	/** Their email, lowercase: the document ID. */
	id: string;
	/** Null until they first sign in. */
	name: string | null;
	email: string;
	role: Role;
	/** Null for super admins, who see every team, and for an organiser who hasn't set up their new team yet. */
	teamId: string | null;
	/** Invited but hasn't signed in yet. */
	invited: boolean;
}

function toOrganiser(snap: DocumentSnapshot): Organiser {
	// A sign-in being recorded reads as signed in already, not "Invited" until the server confirms it
	const data = snap.data({ serverTimestamps: 'estimate' })!;
	return {
		id: snap.id,
		name: data.name ?? null,
		email: snap.id,
		role: data.role,
		teamId: data.teamId ?? null,
		invited: !data.lastSignInAt,
	};
}

// Signing in records your name and when, once per page load, which ends "Invited"
let recorded: string | null = null;

// Null when you're not on the list: the rules refuse to read a document that isn't there
const meStore = liveStore<Organiser | null>((email, emit, fail) =>
	onSnapshot(
		doc(db, 'admins', email),
		(snap) => {
			// Not in this browser's cache isn't "not on the list": wait for the server
			if (!snap.exists()) return snap.metadata.fromCache ? undefined : emit(null);
			const me = toOrganiser(snap);
			emit(me);
			if (recorded !== email && !snap.metadata.fromCache) {
				recorded = email;
				updateDoc(snap.ref, { name: auth.currentUser?.displayName ?? me.name, lastSignInAt: serverTimestamp() }).catch(() => {
					recorded = null;
				});
			}
		},
		(error) => (error instanceof FirebaseError && error.code === 'permission-denied' ? emit(null) : fail(error)),
	),
);

/** The signed-in organiser: null if they're not on the list, undefined while loading. */
export function useCurrentOrganiser() {
	return meStore.use(useSession()?.email ?? null);
}

/**
 * Whether the signed-in organiser can create, edit and delete events and import attendees:
 * organisers and super admins. Team members check people in, add walk-ins and run the prize
 * draw (firestore.rules), so the dashboard doesn't offer them the rest.
 */
export function useCanEditEvents() {
	return useMe().role !== 'team-member';
}

/** The signed-in organiser, on pages RequireOrganiser (App.tsx) has let through. */
export function useMe() {
	const me = useCurrentOrganiser();
	if (!me) throw new Error('useMe() outside RequireOrganiser');
	return me;
}

// Keyed "all" for super admins, or the team's ID
const listStore = liveStore<Organiser[]>((key, emit, fail) => {
	const admins = collection(db, 'admins');
	return onSnapshot(
		key === 'all' ? admins : query(admins, where('teamId', '==', key)),
		(snap) => emit(snap.docs.map(toOrganiser).sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email))),
		fail,
	);
});

/** The organisers `me` can see; undefined while loading. */
export function useOrganisers(me: Organiser) {
	return listStore.use(me.role === 'super-admin' ? 'all' : me.teamId);
}

/** Invited to start a new team and hasn't set it up yet: the dashboard shows onboarding until they do. */
export const needsTeam = (o: Pick<Organiser, 'role' | 'teamId'>) => o.role === 'organiser' && o.teamId === null;

/** Their team’s name for the Organisers page: "All teams" for super admins, "New team" until an invited organiser sets theirs up. */
export function organiserTeam(teams: Team[] | undefined, o: Pick<Organiser, 'role' | 'teamId'>) {
	return needsTeam(o) ? 'New team' : teamName(teams, o.teamId);
}

export function isOrganiser(organisers: Organiser[], email: string) {
	return organisers.some((o) => o.email === email.trim().toLowerCase());
}

/** `teamId` null for an organiser invites them to set up a new team when they first sign in. */
function invite(role: Role, teamId: string | null) {
	return {
		role,
		teamId: role === 'super-admin' ? null : teamId,
		invitedAt: serverTimestamp(),
		invitedBy: auth.currentUser!.email!.toLowerCase(),
	};
}

/** Adds someone to the list. They can sign in straight away. */
export function inviteOrganiser(email: string, role: Role, teamId: string | null) {
	return setDoc(doc(db, 'admins', email.trim().toLowerCase()), invite(role, teamId));
}

export function updateOrganiser(id: string, changes: Pick<Organiser, 'role' | 'teamId'>) {
	return updateDoc(doc(db, 'admins', id), { role: changes.role, teamId: changes.role === 'super-admin' ? null : changes.teamId });
}

export function removeOrganiser(id: string) {
	return deleteDoc(doc(db, 'admins', id));
}

/**
 * Manage team's Save: the team's name and link, members taken off the list, and new
 * invites, in one write. A new team is saved first, because the rules only let an invite
 * name a team that already exists.
 */
export async function saveTeamMembers(team: Team | null, changes: Pick<Team, 'name' | 'slug' | 'country'>, removedIds: string[], invites: { email: string; role: Role }[]) {
	const ref = team ? doc(db, 'teams', team.id) : newTeamRef();
	const batch = writeBatch(db);
	if (team) batch.set(ref, teamData(team, changes));
	else await setDoc(ref, teamData(null, changes));
	for (const id of removedIds) batch.delete(doc(db, 'admins', id));
	for (const { email, role } of invites) batch.set(doc(db, 'admins', email), invite(role, ref.id));
	await batch.commit();
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
