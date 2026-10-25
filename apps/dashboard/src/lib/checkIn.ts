// Staff check-in actions shared by the Check in page and the Attendees table.
import type { DashboardEvent } from './events';
import { addWalkIn, removeAttendee, setCheckedIn, type RosterAttendee } from './roster';
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
export function checkIn(event: DashboardEvent, attendee: RosterAttendee) {
	const name = fullName(attendee);
	setCheckedIn(event, attendee.id, true).catch(() => showToast(`Couldn’t check ${name} in. Try again.`));
	showToast(`${name} checked in`, { label: 'Undo', onClick: () => undoCheckIn(event, attendee) });
}

export function undoCheckIn(event: DashboardEvent, attendee: RosterAttendee) {
	setCheckedIn(event, attendee.id, false).catch(() => showToast(`Couldn’t undo ${fullName(attendee)}’s check-in. Try again.`));
}

/** Takes a walk-in off the list, and out of the counts. */
export function removeWalkIn(event: DashboardEvent, attendee: RosterAttendee) {
	const name = fullName(attendee);
	removeAttendee(event, attendee.id).catch(() => showToast(`Couldn’t remove ${name}. Try again.`));
	showToast(`${name} removed`);
}

/**
 * Adds a walk-in, already checked in. Undo takes them off the list again. Taking the next
 * ticket number needs a connection, so offline it fails straight away and says so.
 */
export async function addWalkInAndCheckIn(event: DashboardEvent, person: Pick<RosterAttendee, 'firstName' | 'lastName' | 'email'>) {
	const name = fullName(person);
	try {
		const ticket = await addWalkIn(event, person);
		showToast(`${name} checked in`, {
			label: 'Undo',
			onClick: () => removeAttendee(event, ticket).catch(() => showToast(`Couldn’t remove ${name}. Try again.`)),
		});
	} catch {
		showToast(`Couldn’t add ${name}. Check the connection and try again.`);
	}
}
