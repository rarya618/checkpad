// Event links (/<slug>) for link previews. Hosting rewrites them here (firebase.json) instead of
// straight to the static check-in page, so the HTML can carry the event's name, date and
// description: Slack, WhatsApp, iMessage and LinkedIn don't run the page's JavaScript, so they'd
// otherwise all show "Check in · checkpad". The page is still the built check-in page, fetched
// from the site, and it still loads the event (and whether check-in is open) itself. It stays
// noindex: check-in links aren't meant to be found by search.
import type { Firestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import type { Request, Response } from 'firebase-functions/https';
import { ApiFailure, getEvent } from './checkin.js';
import { reportError } from './monitoring.js';

const SITE = 'https://checkpad.app';
const SLUG_PATTERN = /^\/([a-z0-9-]+)\/?$/;
const MAX_DESCRIPTION = 200;

/** Fetches the built check-in page from the site: always the deployed build, with its assets. */
export const fetchShell = async (origin = SITE) => {
	const res = await fetch(`${origin}/check-in`);
	if (!res.ok) throw new Error(`Check-in page answered ${res.status}`);
	return res.text();
};

const escapeHtml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "Thu 10 September, 5:00 – 8:00 pm AEST", across days too. */
export function formatWhen(startsAt: string, endsAt: string, timeZone: string) {
	const format = new Intl.DateTimeFormat('en-AU', {
		timeZone,
		weekday: 'short',
		day: 'numeric',
		month: 'long',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short',
	});
	// Intl puts thin and narrow no-break spaces around the dash and before "pm"
	return format.formatRange(new Date(startsAt), new Date(endsAt)).replace(/[  ]/g, ' ');
}

/** The description on one line, cut at a word near MAX_DESCRIPTION characters. */
function summary(description: string) {
	const text = description.replace(/\s+/g, ' ').trim();
	if (text.length <= MAX_DESCRIPTION) return text;
	const cut = text.slice(0, MAX_DESCRIPTION);
	return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : MAX_DESCRIPTION).replace(/[\s.,;:!?-]+$/, '')}…`;
}

/** The check-in page with the event's title, description and Open Graph tags in its head. */
export function withEventTags(shell: string, event: { slug: string; name: string; description: string; startsAt: string; endsAt: string; timeZone: string }) {
	const when = formatWhen(event.startsAt, event.endsAt, event.timeZone);
	const description = [when, summary(event.description)].filter(Boolean).join(' · ');
	const tags = [
		`<title>${escapeHtml(`Check in · ${event.name}`)}</title>`,
		`<meta name="description" content="${escapeHtml(description)}">`,
		`<meta property="og:type" content="website">`,
		`<meta property="og:site_name" content="Checkpad">`,
		`<meta property="og:title" content="${escapeHtml(event.name)}">`,
		`<meta property="og:description" content="${escapeHtml(description)}">`,
		`<meta property="og:url" content="${SITE}/${event.slug}">`,
		`<meta name="twitter:card" content="summary">`,
	].join('');
	return shell.replace(/<title>[^<]*<\/title>/, () => tags);
}

/**
 * Serves /<slug>. An unknown link gets the plain page with a 404, which shows "link not found" as
 * before; if the event can't be read, the plain page still loads and handles it like it always has.
 */
export function createEventPageHandler(db: Firestore, shell: () => Promise<string> = fetchShell) {
	return async (req: Request, res: Response) => {
		if (req.method !== 'GET' && req.method !== 'HEAD') return void res.status(405).send('Method not allowed');
		let page: string;
		try {
			page = await shell();
		} catch (error) {
			logger.error('Could not fetch the check-in page', { error });
			await reportError(error, 'eventPage');
			res.set('Cache-Control', 'no-store');
			return void res.status(502).send('Checkpad is having trouble loading this page. Try again in a moment.');
		}
		res.set('Content-Type', 'text/html; charset=utf-8');
		const slug = req.path.match(SLUG_PATTERN)?.[1];
		try {
			if (!slug) throw new ApiFailure('not-found', 404);
			const event = await getEvent(db, slug);
			// Hosting's CDN keeps the page for five minutes: the tags change rarely, and check-in
			// status comes from the API, so a room scanning at once costs one function call
			res.set('Cache-Control', 'public, max-age=0, s-maxage=300');
			return void res.send(withEventTags(page, event));
		} catch (error) {
			if (error instanceof ApiFailure && error.code === 'not-found') {
				res.set('Cache-Control', 'public, max-age=0, s-maxage=60');
				return void res.status(404).send(page);
			}
			logger.error('Event page failed', { slug, error });
			await reportError(error, 'eventPage');
			res.set('Cache-Control', 'no-store');
			return void res.send(page);
		}
	};
}
