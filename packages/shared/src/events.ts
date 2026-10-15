export interface CheckpadEvent {
	slug: string;
	name: string;
	description: string;
	/** ISO timestamps; check-in is open from startsAt until endsAt. */
	startsAt: string;
	endsAt: string;
	timeZone: string;
}

export type CheckInWindow = 'not-open' | 'open' | 'closed';

export function checkInWindow(event: CheckpadEvent, now = new Date()): CheckInWindow {
	if (now < new Date(event.startsAt)) return 'not-open';
	if (now > new Date(event.endsAt)) return 'closed';
	return 'open';
}
