// Teams changes the rules can't check, for the dashboard. Deleting a team: the rules can't see
// whether an event or organiser still uses it, and deleting one that's in use would leave events
// and people pointing at a team that's gone. Setting up a new organiser's team: the rules can't
// see whether another team already has the name or link, and two teams on one link would leave
// printed signs opening the wrong team's events.
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { ApiFailure } from './checkin.js';
import type { AdminDoc, TeamDoc } from './model.js';

/** The signed-in organiser's email from `Authorization: Bearer <ID token>`. */
async function signedInEmail(auth: Auth, authorization: string | undefined) {
	const token = authorization?.match(/^Bearer (.+)$/)?.[1];
	if (!token) throw new ApiFailure('forbidden', 401);
	const user = await auth.verifyIdToken(token).catch(() => null);
	if (!user?.email || !user.email_verified) throw new ApiFailure('forbidden', 401);
	return user.email.toLowerCase();
}

/** The signed-in organiser's email, if they're a super admin. */
async function superAdmin(db: Firestore, auth: Auth, authorization: string | undefined) {
	const email = await signedInEmail(auth, authorization);
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

// Same checks as isTeam in firestore.rules
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_SLUGS = ['api', 'check-in', 'privacy', 'team'];
const COUNTRY = /^[A-Z]{2}$/;

/** Same as the dashboard's default (apps/dashboard/src/lib/teams.ts): GDGWALKIN for gdg-sydney. */
const walkInPrefix = (slug: string) => `${slug.split('-')[0].toUpperCase().slice(0, 14)}WALKIN`;

function parseTeam(body: { name?: unknown; slug?: unknown; country?: unknown }): Pick<TeamDoc, 'name' | 'slug' | 'country'> {
	const name = typeof body.name === 'string' ? body.name.trim() : '';
	const slug = typeof body.slug === 'string' ? body.slug : '';
	const country = typeof body.country === 'string' ? body.country : '';
	if (!name || name.length > 100 || slug.length > 100 || !SLUG.test(slug) || RESERVED_SLUGS.includes(slug) || !COUNTRY.test(country)) {
		throw new ApiFailure('invalid', 400);
	}
	return { name, slug, country };
}

/**
 * POST /api/onboarding/team with { name, slug, country }: an organiser invited to start a new
 * team (teamId null) creates it and joins it, once. Checked and saved in one transaction, so a
 * team saved at the same moment can't take the same name or link.
 */
export async function setUpTeam(db: Firestore, auth: Auth, authorization: string | undefined, body: Record<string, unknown>) {
	const email = await signedInEmail(auth, authorization);
	const fields = parseTeam(body);
	return db.runTransaction(async (tx) => {
		const me = db.doc(`admins/${email}`);
		const [admin, teams] = await Promise.all([tx.get(me), tx.get(db.collection('teams'))]);
		const data = admin.data() as AdminDoc | undefined;
		if (data?.role !== 'organiser' || data.teamId != null) throw new ApiFailure('forbidden', 403);
		const others = teams.docs.map((d) => d.data() as TeamDoc);
		if (others.some((t) => t.slug === fields.slug)) throw new ApiFailure('slug-taken', 409);
		if (others.some((t) => t.name.toLowerCase() === fields.name.toLowerCase())) throw new ApiFailure('name-taken', 409);
		const team = db.collection('teams').doc();
		tx.create(team, { ...fields, walkInTicketPrefix: walkInPrefix(fields.slug) } satisfies TeamDoc);
		tx.update(me, { teamId: team.id });
		return { status: 'created' as const, teamId: team.id };
	});
}
