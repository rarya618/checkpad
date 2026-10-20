// Firestore documents the check-in API reads and writes. Matches the data model in
// docs/migration-plan.md (Backend approach). Only the Admin SDK touches these: the
// security rules deny all browser access.
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
}

/** events/{eventId}/attendees/{ticket} */
export interface AttendeeDoc {
	firstName: string;
	lastName: string;
	/** Lowercase, so lookups by email match whatever case people type. */
	email: string;
	source: 'bevy' | 'walk-in';
	checkedInAt: Timestamp | null;
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
	globalAccess?: boolean;
}
