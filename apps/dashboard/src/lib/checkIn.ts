// Staff check-in actions shared by the Check in page and the Attendees table.
import { teams, type DashboardEvent } from './events';
import type { RosterAttendee } from './mock';
import { addWalkIn, removeAttendee, setCheckedIn } from './roster';
import { showToast } from './toast';

export function fullName(person: Pick<RosterAttendee, 'firstName' | 'lastName'>) {
	return `${person.firstName} ${person.lastName}`.trim();
}

export function initials(person: Pick<RosterAttendee, 'firstName' | 'lastName'>) {
	return `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`.toUpperCase();
}

/** Exact match on email or ticket number, ignoring case and surrounding spaces. */
export function findAttendee(roster: RosterAttendee[], query: string) {
	const q = query.trim().toLowerCase();
	if (!q) return undefined;
	return roster.find((a) => a.email.toLowerCase() === q || a.ticket?.toLowerCase() === q);
}

export function looksLikeEmail(text: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

/** Checks someone in and offers Undo in the toast (Figma "Toast – checked in"). */
export function checkIn(eventSlug: string, attendee: RosterAttendee) {
	setCheckedIn(eventSlug, attendee.id, new Date());
	showToast(`${fullName(attendee)} checked in`, { label: 'Undo', onClick: () => setCheckedIn(eventSlug, attendee.id, null) });
}

export function walkInTicketPrefix(event: DashboardEvent) {
	return (teams.find((team) => team.name === event.team) ?? teams[0]).walkInTicketPrefix;
}

/** Adds a walk-in, already checked in. Undo takes them off the list again. */
export function addWalkInAndCheckIn(event: DashboardEvent, person: Pick<RosterAttendee, 'firstName' | 'lastName' | 'email'>) {
	const attendee = addWalkIn(event.slug, person, walkInTicketPrefix(event));
	showToast(`${fullName(attendee)} checked in`, { label: 'Undo', onClick: () => removeAttendee(event.slug, attendee.id) });
	return attendee;
}
