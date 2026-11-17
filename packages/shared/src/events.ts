export interface CheckpadEvent {
	slug: string;
	name: string;
	description: string;
	/** ISO timestamps. They don't open or close check-in; selfCheckInOpen does. */
	startsAt: string;
	endsAt: string;
	timeZone: string;
	/** The team whose permanent link (checkpad.app/team/<slug>) can open this event. */
	teamSlug?: string;
	/** Whether people who aren't on the list can add themselves as walk-ins on the check-in
	 *  page. Staff can always add walk-ins from the dashboard. */
	selfWalkIns: boolean;
	/** The organiser's "Self check-in open" switch in Event settings. Attendees can only
	 *  check themselves in while it's on; staff can always check people in. */
	selfCheckInOpen: boolean;
	/** Where to get a ticket, for anyone who opens the check-in link before it opens; empty for none. */
	ticketUrl?: string;
}

export interface Team {
	slug: string;
	name: string;
}

export type CheckInStatus = 'not-open' | 'open' | 'closed';

/** Open while the switch is on, whatever the time. While it's off, the start time only
 *  decides whether attendees see "Not open yet" or "Check-in closed". */
export function checkInStatus({ open, startsAt }: { open: boolean; startsAt: string }, now = new Date()): CheckInStatus {
	if (open) return 'open';
	return now < new Date(startsAt) ? 'not-open' : 'closed';
}

/** Event links that would clash with the attendee site's own pages, which Hosting serves
 *  before its event-link rewrite (firebase.json), so an event there could never be opened. */
export const RESERVED_SLUGS = new Set(['api', 'check-in', 'docs', 'privacy', 'team']);

/** Longest ticket link firestore.rules allows. */
export const MAX_TICKET_URL_LENGTH = 500;

/**
 * A typed ticket link as it's saved: trimmed, with https:// added when there's no scheme
 * ("lu.ma/october" → "https://lu.ma/october"). '' when it's empty, and null when it isn't a
 * web address firestore.rules would take: http or https, with a host that has a dot, no spaces.
 */
export function cleanTicketUrl(text: string): string | null {
	const typed = text.trim();
	if (!typed) return '';
	const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(typed) ? typed : `https://${typed}`;
	if (withScheme.length > MAX_TICKET_URL_LENGTH || /\s/.test(withScheme)) return null;
	try {
		const url = new URL(withScheme);
		if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return null;
	} catch {
		return null;
	}
	// The rules want the scheme in lowercase and followed by //: "HTTPS://lu.ma" is fine, "https:lu.ma" isn't
	if (!/^https?:\/\//i.test(withScheme)) return null;
	return withScheme.replace(/^https?/i, (scheme) => scheme.toLowerCase());
}
