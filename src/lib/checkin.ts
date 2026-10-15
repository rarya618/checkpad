// Mock check-in API. Everything lives in memory in the browser, so state resets on
// reload and the guest list ships to the client. Swap these functions for real
// network calls once there's a backend; the UI only depends on their signatures.

export interface Attendee {
	email: string;
	firstName: string;
	lastName: string;
	checkedInAt: Date | null;
}

export type CheckInResult =
	| { status: 'checked-in'; attendee: Attendee }
	| { status: 'not-registered' };

const attendeesByEvent: Record<string, Attendee[]> = {
	'gdg-september-meetup': [
		{ email: 'attendee@sample.com', firstName: 'Sample', lastName: 'Attendee', checkedInAt: null },
		{ email: 'attendee-2@sample.com', firstName: 'Another', lastName: 'Attendee', checkedInAt: null },
		{ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe', checkedInAt: null },
	],
};

const normalise = (email: string) => email.trim().toLowerCase();
const delay = () => new Promise((resolve) => setTimeout(resolve, 400));

export async function checkIn(eventSlug: string, email: string): Promise<CheckInResult> {
	await delay();
	const attendee = attendeesByEvent[eventSlug]?.find((a) => a.email === normalise(email));
	if (!attendee) return { status: 'not-registered' };
	attendee.checkedInAt ??= new Date();
	return { status: 'checked-in', attendee };
}

export async function checkInWalkIn(
	eventSlug: string,
	details: { email: string; firstName: string; lastName: string },
): Promise<Attendee> {
	await delay();
	const attendee: Attendee = {
		email: normalise(details.email),
		firstName: details.firstName.trim(),
		lastName: details.lastName.trim(),
		checkedInAt: new Date(),
	};
	(attendeesByEvent[eventSlug] ??= []).push(attendee);
	return attendee;
}
