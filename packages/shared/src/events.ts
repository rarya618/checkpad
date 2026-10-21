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
}

export interface Team {
	slug: string;
	name: string;
}

export type CheckInStatus = 'not-open' | 'open' | 'closed';

/** Open while the switch is on, whatever the time. While it's off, the start time only
 *  decides whether attendees see "Not open yet" or "Check-in closed". */
export function checkInStatus(event: CheckpadEvent, now = new Date()): CheckInStatus {
	if (event.selfCheckInOpen) return 'open';
	return now < new Date(event.startsAt) ? 'not-open' : 'closed';
}
