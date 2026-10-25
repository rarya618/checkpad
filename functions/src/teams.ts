// Deleting a team, for super admins in the dashboard. The rules can't do it: they can't see
// whether an event or organiser still uses the team, and deleting one that's in use would
// leave events and people pointing at a team that's gone.
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { ApiFailure } from './checkin.js';
import type { AdminDoc } from './model.js';

/** The signed-in organiser's email from `Authorization: Bearer <ID token>`, if they're a super admin. */
async function superAdmin(db: Firestore, auth: Auth, authorization: string | undefined) {
	const token = authorization?.match(/^Bearer (.+)$/)?.[1];
	if (!token) throw new ApiFailure('forbidden', 401);
	const user = await auth.verifyIdToken(token).catch(() => null);
	if (!user?.email || !user.email_verified) throw new ApiFailure('forbidden', 401);
	const email = user.email.toLowerCase();
	const admin = (await db.doc(`admins/${email}`).get()).data() as AdminDoc | undefined;
	if (admin?.role !== 'super-admin') throw new ApiFailure('forbidden', 403);
	return email;
}

/**
 * DELETE /api/admin/teams/:teamId: deletes a team no event or organiser uses. Checked and
 * deleted in one transaction, so an event or invite saved at the same moment can't slip in.
 */
export async function deleteTeam(db: Firestore, auth: Auth, authorization: string | undefined, teamId: string) {
	await superAdmin(db, auth, authorization);
	await db.runTransaction(async (tx) => {
		const team = db.doc(`teams/${teamId}`);
		const [snap, events, members] = await Promise.all([
			tx.get(team),
			tx.get(db.collection('events').where('teamIds', 'array-contains', teamId).limit(1)),
			tx.get(db.collection('admins').where('teamId', '==', teamId).limit(1)),
		]);
		if (!snap.exists) throw new ApiFailure('not-found', 404);
		if (!events.empty || !members.empty) throw new ApiFailure('in-use', 409);
		tx.delete(team);
	});
	return { status: 'deleted' as const };
}
