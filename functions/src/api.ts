// Routes for the check-in API. The attendee site reaches it at /api/... through a Hosting
// rewrite (firebase.json), so requests arrive with the /api prefix; called directly (or in
// the emulator) they don't. Both work.
import type { ApiError } from '@checkpad/shared/api';
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import type { Request, Response } from 'firebase-functions/https';
import { ApiFailure, checkIn, getEvent, teamTarget, walkIn } from './checkin.js';
import { allowAttempt } from './rateLimit.js';

const SLUG = '([a-z0-9-]+)';
const EVENT_ROUTE = new RegExp(`^/events/${SLUG}/?$`);
const ACTION_ROUTE = new RegExp(`^/events/${SLUG}/(check-in|walk-in)/?$`);
const TEAM_ROUTE = new RegExp(`^/teams/${SLUG}/?$`);

/** The attendee's address: Hosting's CDN passes it on; otherwise the first forwarded hop. */
function clientIp(req: Request) {
	const header = (name: string) => [req.headers[name]].flat()[0];
	return header('fastly-client-ip') ?? header('x-forwarded-for')?.split(',')[0].trim() ?? req.ip ?? 'unknown';
}

function fail(res: Response, status: number, error: ApiError['error']) {
	res.status(status).json({ error } satisfies ApiError);
}

export function createHandler(db: Firestore) {
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
			return fail(res, 404, 'not-found');
		} catch (error) {
			if (error instanceof ApiFailure) return fail(res, error.status, error.code);
			logger.error('Check-in API failed', { path, method: req.method, error });
			return fail(res, 500, 'server');
		}
	};
}
