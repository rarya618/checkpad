// Responses from the check-in API (functions/, served at /api on the attendee site).
// Types only, so the functions bundle doesn't depend on this package at runtime.

/** GET /api/events/:slug: what the check-in page shows before anyone types an email. */
export interface PublicEvent {
	slug: string;
	name: string;
	description: string;
	/** ISO timestamps. */
	startsAt: string;
	endsAt: string;
	timeZone: string;
	/** The organiser's "Self check-in open" switch. */
	open: boolean;
	/** Whether people not on the list can add themselves as walk-ins. */
	selfWalkIns: boolean;
}

/** What the confirmation screen shows: never the attendee list, email or last name. */
export interface CheckedIn {
	status: 'checked-in';
	firstName: string;
	ticket: string;
	/** ISO timestamp of the first check-in. */
	checkedInAt: string;
	alreadyCheckedIn: boolean;
}

/** POST /api/events/:slug/check-in with { email }. */
export type CheckInResponse = CheckedIn | { status: 'not-registered'; selfWalkIns: boolean };

/** POST /api/events/:slug/walk-in with { email, firstName, lastName }. Someone already on
 *  the list is checked in under their own ticket instead of getting a walk-in one. */
export type WalkInResponse = CheckedIn;

/** GET /api/teams/:slug: where a team's permanent link should go right now. */
export interface TeamTarget {
	team: { slug: string; name: string };
	/** The team's event that's open, or else its next one that hasn't finished; null if none. */
	eventSlug: string | null;
}

export type ApiErrorCode =
	| 'not-found' // no event or team with that link
	| 'closed' // self check-in isn't open
	| 'walk-ins-off' // the event doesn't let attendees add themselves
	| 'invalid' // missing or malformed fields
	| 'rate-limited' // too many attempts from one network; try again shortly
	| 'server';

export interface ApiError {
	error: ApiErrorCode;
}
