export interface CheckpadEvent {
	slug: string;
	name: string;
	description: string;
	/** ISO timestamps; check-in is open from startsAt until endsAt. */
	startsAt: string;
	endsAt: string;
	timeZone: string;
	/** The team whose permanent link (checkpad.app/team/<slug>) can open this event. */
	teamSlug?: string;
	/** Whether people who aren't on the list can add themselves as walk-ins on the check-in
	 *  page. Staff can always add walk-ins from the dashboard. */
	selfWalkIns: boolean;
}

export interface Team {
	slug: string;
	name: string;
}

export type CheckInWindow = 'not-open' | 'open' | 'closed';

export function checkInWindow(event: CheckpadEvent, now = new Date()): CheckInWindow {
	if (now < new Date(event.startsAt)) return 'not-open';
	if (now > new Date(event.endsAt)) return 'closed';
	return 'open';
}
