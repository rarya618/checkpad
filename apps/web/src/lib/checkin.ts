// Mock check-in API. Everything lives in memory in the browser, so state resets on
// reload and the guest list ships to the client. Swap these functions for real
// network calls once there's a backend; the UI only depends on their signatures.

import type { Attendee } from '@checkpad/shared/attendees';

export type CheckInResult =
	| { status: 'checked-in'; attendee: Attendee; alreadyCheckedIn: boolean }
	| { status: 'not-registered' };

// A real backend must also reject check-ins outside the event's window; the UI
// only hides the form.
const sampleAttendees = (): Attendee[] => [
	{ email: 'attendee@sample.com', firstName: 'Sample', lastName: 'Attendee', checkedInAt: null, ticket: 'GOOGA263293408' },
	{ email: 'attendee-2@sample.com', firstName: 'Another', lastName: 'Attendee', checkedInAt: null, ticket: 'GOOGA263288757' },
	{ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', checkedInAt: null, ticket: 'GOOGA263290115' },
];

const attendeesByEvent: Record<string, Attendee[]> = {
	'gdg-september-meetup': sampleAttendees(),
	'checkpad-demo': sampleAttendees(),
	'gdg-future-meetup': sampleAttendees(),
};

const normalise = (email: string) => email.trim().toLowerCase();
const delay = () => new Promise((resolve) => setTimeout(resolve, 400));

export async function checkIn(eventSlug: string, email: string): Promise<CheckInResult> {
	await delay();
	const attendee = attendeesByEvent[eventSlug]?.find((a) => a.email === normalise(email));
	if (!attendee) return { status: 'not-registered' };
	const alreadyCheckedIn = attendee.checkedInAt !== null;
	attendee.checkedInAt ??= new Date();
	return { status: 'checked-in', attendee, alreadyCheckedIn };
}

export async function checkInWalkIn(
	eventSlug: string,
	details: { email: string; firstName: string; lastName: string },
): Promise<Attendee> {
	await delay();
	const list = (attendeesByEvent[eventSlug] ??= []);
	const walkIns = list.filter((a) => a.ticket?.startsWith('GDGWALKIN')).length;
	const attendee: Attendee = {
		email: normalise(details.email),
		firstName: details.firstName.trim(),
		lastName: details.lastName.trim(),
		checkedInAt: new Date(),
		ticket: `GDGWALKIN${String(walkIns + 1).padStart(4, '0')}`,
	};
	list.push(attendee);
	return attendee;
}
