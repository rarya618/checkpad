// Routes for the check-in API, the dashboard's sign-in links (organisers.ts), and deleting
// and setting up teams (teams.ts). Both sites reach it at /api/... through a Hosting rewrite (firebase.json),
// so requests arrive with the /api prefix; called directly (or in the emulator) they don't.
// Both work.
import type { ApiError } from '@checkpad/shared/api';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import type { Request, Response } from 'firebase-functions/https';
import { ApiFailure, checkIn, getEvent, teamTarget, walkIn } from './checkin.js';
import type { Mailer } from './email.js';
import { sendSignInLink } from './organisers.js';
import { allowAttempt } from './rateLimit.js';
import { deleteTeam, setUpTeam } from './teams.js';

const SLUG = '([a-z0-9-]+)';
const EVENT_ROUTE = new RegExp(`^/events/${SLUG}/?$`);
const ACTION_ROUTE = new RegExp(`^/events/${SLUG}/(check-in|walk-in)/?$`);
const TEAM_ROUTE = new RegExp(`^/teams/${SLUG}/?$`);
const SIGN_IN_ROUTE = /^\/auth\/sign-in-link\/?$/;
const ADMIN_TEAM_ROUTE = /^\/admin\/teams\/([A-Za-z0-9_-]+)\/?$/;
const ONBOARDING_TEAM_ROUTE = /^\/onboarding\/team\/?$/;

// Sign-in links per network and per address in ten minutes: plenty for organisers who mistype
// or ask again, and few enough that the endpoint can't be used to flood someone's inbox
const SIGN_IN_LIMIT_PER_IP = 30;
const SIGN_IN_LIMIT_PER_EMAIL = 5;

/** The attendee's address: Hosting's CDN passes it on; otherwise the first forwarded hop. */
function clientIp(req: Request) {
	const header = (name: string) => [req.headers[name]].flat()[0];
	return header('fastly-client-ip') ?? header('x-forwarded-for')?.split(',')[0].trim() ?? req.ip ?? 'unknown';
}

function fail(res: Response, status: number, error: ApiError['error']) {
	res.status(status).json({ error } satisfies ApiError);
}

/** `mail` gives the mailer when a request needs one (email.ts): secrets can only be read then. */
export function createHandler(db: Firestore, auth: Auth, mail: () => Mailer) {
	return async (req: Request, res: Response) => {
		const path = req.path.replace(/^\/api(?=\/)/, '');
		try {
			let match: RegExpMatchArray | null;
			if ((match = path.match(EVENT_ROUTE)) || (match = path.match(TEAM_ROUTE))) {
				if (req.method !== 'GET') return fail(res, 405, 'invalid');
				// Hosting's CDN may keep these for 15 seconds: opening check-in in the dashboard
				// reaches attendees within that, and a room scanning at once costs one function call
				res.set('Cache-Control', 'public, max-age=0, s-maxage=15');
				const body = path.startsWith('/events/') ? await getEvent(db, match[1]) : await teamTarget(db, match[1]);
				return void res.json(body);
			}
			if ((match = path.match(ACTION_ROUTE))) {
				if (req.method !== 'POST') return fail(res, 405, 'invalid');
				res.set('Cache-Control', 'no-store');
				const [, slug, action] = match;
				if (!(await allowAttempt(db, clientIp(req), slug))) return fail(res, 429, 'rate-limited');
				const body = (req.body ?? {}) as Record<string, unknown>;
				return void res.json(action === 'check-in' ? await checkIn(db, slug, body) : await walkIn(db, slug, body));
			}
			if (SIGN_IN_ROUTE.test(path)) {
				if (req.method !== 'POST') return fail(res, 405, 'invalid');
				res.set('Cache-Control', 'no-store');
				const body = (req.body ?? {}) as Record<string, unknown>;
				const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
				const allowed =
					(await allowAttempt(db, clientIp(req), 'sign-in', Date.now(), SIGN_IN_LIMIT_PER_IP)) &&
					(await allowAttempt(db, email, 'sign-in', Date.now(), SIGN_IN_LIMIT_PER_EMAIL));
				if (!allowed) return fail(res, 429, 'rate-limited');
				return void res.json(await sendSignInLink(db, auth, mail(), body, [req.headers.origin].flat()[0]));
			}
			if ((match = path.match(ADMIN_TEAM_ROUTE))) {
				if (req.method !== 'DELETE') return fail(res, 405, 'invalid');
				res.set('Cache-Control', 'no-store');
				return void res.json(await deleteTeam(db, auth, req.headers.authorization, match[1]));
			}
			if (ONBOARDING_TEAM_ROUTE.test(path)) {
				if (req.method !== 'POST') return fail(res, 405, 'invalid');
				res.set('Cache-Control', 'no-store');
				return void res.json(await setUpTeam(db, auth, req.headers.authorization, (req.body ?? {}) as Record<string, unknown>));
			}
			return fail(res, 404, 'not-found');
		} catch (error) {
			if (error instanceof ApiFailure) return fail(res, error.status, error.code);
			logger.error('Check-in API failed', { path, method: req.method, error });
			return fail(res, 500, 'server');
		}
	};
}
