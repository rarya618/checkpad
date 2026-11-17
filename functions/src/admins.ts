// Changes to organisers that the rules can't check, for super admins in the dashboard. A super
// admin may change anyone, themselves included, but never in a way that leaves nobody able to
// manage organisers: demoting yourself, moving yourself to another address or removing yourself
// needs another super admin who has signed in (an invite to a mistyped address doesn't count).
// Moving someone to another address moves their record, because the address is its ID.
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { ApiFailure, parseEmail } from './checkin.js';
import type { AdminDoc } from './model.js';
import { superAdmin } from './teams.js';

const ROLES: AdminDoc['role'][] = ['super-admin', 'organiser', 'team-member'];

/** Same limit as signing in records (firestore.rules). */
const MAX_NAME_LENGTH = 200;

interface Changes {
	role: AdminDoc['role'];
	teamId: string | null;
	/** Undefined keeps the name; null clears it. */
	name: string | null | undefined;
	/** Undefined keeps the address. */
	email: string | undefined;
}

function parseChanges(body: Record<string, unknown>): Changes {
	const role = body.role as AdminDoc['role'];
	if (!ROLES.includes(role)) throw new ApiFailure('invalid', 400);
	const teamId = role === 'super-admin' || body.teamId == null ? null : body.teamId;
	if (teamId !== null && (typeof teamId !== 'string' || !teamId)) throw new ApiFailure('invalid', 400);
	let name: string | null | undefined;
	if (body.name === null) name = null;
	else if (body.name !== undefined) {
		if (typeof body.name !== 'string' || body.name.trim().length > MAX_NAME_LENGTH) throw new ApiFailure('invalid', 400);
		name = body.name.trim() || null;
	}
	const email = body.email === undefined ? undefined : parseEmail(body.email);
	return { role, teamId, name, email };
}

/** Refuses a change that would leave `me` as the only super admin who can still sign in. */
async function needAnotherSuperAdmin(db: Firestore, tx: Transaction, me: string) {
	const supers = await tx.get(db.collection('admins').where('role', '==', 'super-admin'));
	if (!supers.docs.some((d) => d.id !== me && d.get('lastSignInAt'))) throw new ApiFailure('last-super-admin', 409);
}

/**
 * PATCH /api/admin/organisers/:email with { role, teamId, name?, email? }: changes someone's role
 * and team, their name, and their address. A new address moves the record there with the same
 * role, team and name, as a fresh invite (the inviteOrganiser trigger emails it), and the old
 * address loses access.
 */
export async function editOrganiser(db: Firestore, auth: Auth, authorization: string | undefined, id: string, body: Record<string, unknown>) {
	const me = await superAdmin(db, auth, authorization);
	const changes = parseChanges(body);
	return db.runTransaction(async (tx) => {
		const ref = db.doc(`admins/${id}`);
		const snap = await tx.get(ref);
		if (!snap.exists) throw new ApiFailure('not-found', 404);
		const before = snap.data() as AdminDoc;
		// An organiser without a team is one invited to start their own; nobody else goes teamless
		if (changes.teamId === null && changes.role === 'team-member') throw new ApiFailure('invalid', 400);
		if (changes.teamId !== null && !(await tx.get(db.doc(`teams/${changes.teamId}`))).exists) throw new ApiFailure('invalid', 400);
		const moving = changes.email !== undefined && changes.email !== id;
		if (id === me && (changes.role !== 'super-admin' || moving)) await needAnotherSuperAdmin(db, tx, me);
		const name = changes.name === undefined ? (before.name ?? null) : changes.name;
		if (moving) {
			const target = db.doc(`admins/${changes.email}`);
			if ((await tx.get(target)).exists) throw new ApiFailure('email-taken', 409);
			tx.create(target, { role: changes.role, teamId: changes.teamId, name, invitedAt: FieldValue.serverTimestamp(), invitedBy: me });
			tx.delete(ref);
		} else {
			tx.update(ref, { role: changes.role, teamId: changes.teamId, ...(changes.name !== undefined && { name }) });
		}
		return { status: 'saved' as const, email: moving ? changes.email! : id };
	});
}

/** DELETE /api/admin/organisers/:email: takes someone off the list, yourself included while another super admin can sign in. */
export async function removeOrganiser(db: Firestore, auth: Auth, authorization: string | undefined, id: string) {
	const me = await superAdmin(db, auth, authorization);
	await db.runTransaction(async (tx) => {
		const ref = db.doc(`admins/${id}`);
		if (!(await tx.get(ref)).exists) throw new ApiFailure('not-found', 404);
		if (id === me) await needAnotherSuperAdmin(db, tx, me);
		tx.delete(ref);
	});
	return { status: 'removed' as const };
}
