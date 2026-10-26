// Firestore documents the check-in API reads and writes. Matches the data model in
// docs/migration-plan.md (Backend approach). Browsers reach them only through the
// dashboard, as signed-in organisers (firestore.rules).
import type { Timestamp } from 'firebase-admin/firestore';

/** events/{eventId} */
export interface EventDoc {
	slug: string;
	name: string;
	description: string;
	/** The dashboard's "Self check-in open" switch. Attendees can only check in while it's open. */
	status: 'open' | 'closed';
	startsAt: Timestamp;
	endsAt: Timestamp;
	timeZone: string;
	teamIds: string[];
	counts: { registered: number; checkedIn: number; walkIns: number };
	/** The last walk-in number handed out; the next walk-in gets one more. */
	walkInCounter: number;
	/** Walk-in tickets are this plus four digits: GDGWALKIN0005. Copied from the team when the event is made. */
	walkInTicketPrefix: string;
	/** Whether people not on the list can add themselves as walk-ins. Staff always can. */
	selfWalkIns: boolean;
	legacyId?: string;
	/** Shown on walk-ins' tickets in the Bevy export. */
	walkInTicketTitle?: string;
	walkInVenue?: string;
	/** Who last opened or closed self check-in, and when: "Opened by Priya at 16:45". */
	statusChangedBy?: string;
	statusChangedAt?: Timestamp;
}

/** events/{eventId}/attendees/{ticket} */
export interface AttendeeDoc {
	firstName: string;
	lastName: string;
	/** Lowercase, so lookups by email match whatever case people type. */
	email: string;
	source: 'bevy' | 'walk-in';
	checkedInAt: Timestamp | null;
	/** The organiser who checked them in from the dashboard; absent for self check-in. */
	checkedInBy?: string | null;
	jobTitle?: string;
	company?: string;
	ticketType?: string;
	ticketTitle?: string;
	ticketVenue?: string;
	bevyOrderNumber?: string;
}

/** teams/{teamId} */
export interface TeamDoc {
	name: string;
	slug: string;
	/** New events copy it: GDGWALKIN */
	walkInTicketPrefix: string;
	globalAccess?: boolean;
	/** ISO 3166-1 alpha-2: "AU". New events start in its time zone (packages/shared/src/countries.ts). */
	country?: string;
}

/** admins/{email}: who can sign in to the dashboard, and what they can do (firestore.rules). */
export interface AdminDoc {
	role: 'super-admin' | 'organiser' | 'team-member';
	/**
	 * Null for super admins, who see every team, and for an organiser invited to start a new
	 * team, until they set it up when they first sign in (teams.ts).
	 */
	teamId: string | null;
	invitedAt: Timestamp;
	invitedBy: string;
	/** Set when they sign in; "Invited" until then. */
	name?: string | null;
	lastSignInAt?: Timestamp;
}

/** slugs/{slug}: claims an event link (firestore.rules). */
export interface SlugDoc {
	eventId: string;
}
