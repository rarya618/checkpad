// Emails for the dashboard's organisers: sign-in links and invites (templates in email.ts).
import { randomUUID } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { ApiFailure, parseEmail } from './checkin.js';
import type { Mailer } from './email.js';
import type { AdminDoc, TeamDoc } from './model.js';

/** Where the dashboard runs. Sign-in links only ever lead back to one of these. */
const DASHBOARD_ORIGINS = ['https://manage.checkpad.app', 'https://checkpad-app.web.app', 'https://checkpad-app.firebaseapp.com'];
export const DASHBOARD_URL = DASHBOARD_ORIGINS[0];

/** The page asking for a link, if it's the dashboard (or a local copy, in the emulators). */
function dashboardOrigin(origin: string | undefined) {
	if (origin && DASHBOARD_ORIGINS.includes(origin)) return origin;
	if (origin && process.env.FUNCTIONS_EMULATOR === 'true' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return origin;
	throw new ApiFailure('invalid', 400);
}

/**
 * POST /api/auth/sign-in-link with { email, next }: emails a one-time link that signs in to the
 * dashboard and returns to `next`. Only organisers get one, but the answer is the same either
 * way, so the endpoint can't be used to find out who's on the list or to email strangers.
 */
export async function sendSignInLink(db: Firestore, auth: Auth, mail: Mailer, body: { email?: unknown; next?: unknown }, origin: string | undefined) {
	const email = parseEmail(body.email);
	const base = dashboardOrigin(origin);
	const next = typeof body.next === 'string' && body.next.startsWith('/') && !body.next.startsWith('//') ? body.next : '/events';
	if (!(await db.doc(`admins/${email}`).get()).exists) {
		logger.info('Sign-in link not sent: not an organiser');
		return { status: 'sent' as const };
	}
	const link = await auth.generateSignInWithEmailLink(email, {
		url: `${base}/sign-in/link?${new URLSearchParams({ next })}`,
		handleCodeInApp: true,
	});
	await mail({ to: email, template: 'sign-in', variables: { ADDRESS: email, LINK: link }, idempotencyKey: `sign-in/${randomUUID()}` });
	return { status: 'sent' as const };
}

const ROLES: Record<AdminDoc['role'], string> = { 'super-admin': 'a super admin', organiser: 'an organiser', 'team-member': 'a team member' };

function access(role: AdminDoc['role'], team: string) {
	if (role === 'super-admin') return 'You can see and run every team’s events, and manage organisers.';
	if (role === 'organiser') return `You can create and edit ${team}’s events.`;
	return `You can check people in at ${team}’s events.`;
}

/** What to do first, so the first time they see check-in from an attendee's side isn't on the night. */
function firstSteps(role: AdminDoc['role']) {
	if (role === 'super-admin') return 'Start on the Events page, or add organisers from Organisers.';
	if (role === 'organiser') {
		return 'For your first event: create it, import the attendee CSV from Bevy, then scan its QR code with your own phone and check in as someone on the list. You can undo that check-in on the Attendees page.';
	}
	return 'Before the night, open the event, scan its QR code with your own phone and check in as someone on the list, so you know what attendees see. You can undo that check-in on the Attendees page.';
}

/**
 * After an organiser is added from the dashboard: tells them, and how to sign in. `runId` is the
 * trigger's event ID, so a repeat delivery of the trigger sends nothing new. Documents written
 * outside the dashboard (seeding, the console) have no invitedBy and get no email.
 */
export async function sendInvite(db: Firestore, mail: Mailer, run: { id: string; email: string; admin: DocumentData | undefined }) {
	const admin = run.admin as AdminDoc | undefined;
	if (!admin?.invitedBy) return;
	const [inviter, team] = await Promise.all([
		db.doc(`admins/${admin.invitedBy}`).get(),
		admin.teamId ? db.doc(`teams/${admin.teamId}`).get() : null,
	]);
	await mail({
		to: run.email,
		template: 'invite',
		variables: {
			INVITER: inviter.get('name') ?? admin.invitedBy,
			ROLE: ROLES[admin.role],
			ACCESS: access(admin.role, (team?.data() as TeamDoc | undefined)?.name ?? 'your team'),
			NEXT: firstSteps(admin.role),
			ADDRESS: run.email,
			LINK: `${DASHBOARD_URL}/sign-in`,
		},
		idempotencyKey: `invite/${run.id}`,
	});
}
