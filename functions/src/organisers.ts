// Emails for the dashboard's organisers: sign-in emails and invites (templates in email.ts).
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import { Timestamp, type DocumentData, type Firestore } from 'firebase-admin/firestore';
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
 * Moves a sign-in link from Firebase's default action page on checkpad-app.firebaseapp.com to the
 * same page on manage.checkpad.app (Hosting serves /__/auth/action on every domain), so the email
 * doesn't look like phishing. The project's action URL setting would do this, but Firebase won't
 * let this project change it (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED), and linkDomain only applies to
 * mobile apps. Emulator links are left alone.
 */
export function onDashboardDomain(link: string) {
	const url = new URL(link);
	if (url.hostname.endsWith('.firebaseapp.com') && url.pathname === '/__/auth/action') url.host = new URL(DASHBOARD_URL).host;
	return url.toString();
}

/** How long a sign-in code works, and how many wrong tries it takes before it stops working. */
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_TRIES = 5;

/** Codes are kept only as a hash, tied to the address, in signInCodes/{hash of the address}. */
const hash = (text: string) => createHash('sha256').update(text).digest();
const codeRef = (db: Firestore, email: string) => db.collection('signInCodes').doc(hash(`email|${email}`).toString('hex'));
const codeHash = (email: string, code: string) => hash(`code|${email}|${code}`);

/**
 * POST /api/auth/sign-in-link with { email, next }: emails a six-digit code and a one-time link,
 * either of which signs in to the dashboard (the link returning to `next`), so an organiser can
 * read the email on one device and sign in on another. A new email replaces the last one's code.
 * Only organisers get one, but the answer is the same either way, so the endpoint can't be used
 * to find out who's on the list or to email strangers.
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
	const code = String(randomInt(1_000_000)).padStart(6, '0');
	await codeRef(db, email).set({ hash: codeHash(email, code), wrongTries: 0, expireAt: Timestamp.fromMillis(Date.now() + CODE_TTL_MS) });
	await mail({
		to: email,
		template: 'sign-in',
		variables: { ADDRESS: email, CODE: `${code.slice(0, 3)} ${code.slice(3)}`, LINK: onDashboardDomain(link) },
		idempotencyKey: `sign-in/${randomUUID()}`,
	});
	return { status: 'sent' as const };
}

/**
 * POST /api/auth/sign-in-code with { email, code }: swaps the emailed code for a Firebase custom
 * token, which the dashboard signs in with. A code works once, for ten minutes, and stops working
 * after five wrong tries. Every failure is the same "wrong-code", whether there's no code for the
 * address (it isn't an organiser, or never asked), it's expired, used or simply wrong, so this
 * can't be used to find out who's on the list either.
 */
export async function signInWithCode(db: Firestore, auth: Auth, body: { email?: unknown; code?: unknown }) {
	const email = parseEmail(body.email);
	const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
	if (!/^\d{6}$/.test(code)) throw new ApiFailure('wrong-code', 400);
	const ref = codeRef(db, email);
	const right = await db.runTransaction(async (tx) => {
		const saved = await tx.get(ref);
		const stored = saved.get('hash') as Buffer | undefined;
		if (!saved.exists || !stored || (saved.get('expireAt') as Timestamp).toMillis() < Date.now()) return false;
		if (timingSafeEqual(Buffer.from(stored), codeHash(email, code))) {
			tx.delete(ref);
			return true;
		}
		const wrongTries = (saved.get('wrongTries') ?? 0) + 1;
		if (wrongTries >= CODE_TRIES) tx.delete(ref);
		else tx.update(ref, { wrongTries });
		return false;
	});
	// Removed from the list since the email went out: the code goes nowhere
	if (!right || !(await db.doc(`admins/${email}`).get()).exists) throw new ApiFailure('wrong-code', 400);
	// The same account an email link or Google would sign in to, with the address marked as
	// verified, since they've just shown they can read its email (the rules ask for that)
	const user = await auth.getUserByEmail(email).catch((error: { code?: string }) => {
		if (error.code === 'auth/user-not-found') return auth.createUser({ email, emailVerified: true });
		throw error;
	});
	if (!user.emailVerified) await auth.updateUser(user.uid, { emailVerified: true });
	return { token: await auth.createCustomToken(user.uid) };
}

const ROLES: Record<AdminDoc['role'], string> = { 'super-admin': 'a super admin', organiser: 'an organiser', 'team-member': 'a team member' };

/** `team` is null for an organiser who sets up a new team when they first sign in. */
function access(role: AdminDoc['role'], team: string | null) {
	if (role === 'super-admin') return 'You can see and run every team’s events, and manage organisers.';
	if (role === 'organiser') return team ? `You can create and edit ${team}’s events.` : 'You can set up your team and create and edit its events.';
	return `You can check people in at ${team ?? 'your team'}’s events.`;
}

const FIRST_EVENT =
	'For your first event: create it, import the attendee CSV from Bevy, then scan its QR code with your own phone and check in as someone on the list. You can undo that check-in on the Attendees page.';

/** What to do first, so the first time they see check-in from an attendee's side isn't on the night. */
function firstSteps(role: AdminDoc['role'], newTeam: boolean) {
	if (role === 'super-admin') return 'Start on the Events page, or add organisers from Organisers.';
	if (role === 'organiser') return newTeam ? `When you first sign in, name your team and say where it meets. ${FIRST_EVENT}` : FIRST_EVENT;
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
			ACCESS: access(admin.role, admin.teamId ? ((team?.data() as TeamDoc | undefined)?.name ?? 'your team') : null),
			NEXT: firstSteps(admin.role, !admin.teamId),
			ADDRESS: run.email,
			LINK: `${DASHBOARD_URL}/sign-in`,
		},
		idempotencyKey: `invite/${run.id}`,
	});
}
