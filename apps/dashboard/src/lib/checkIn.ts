// Staff check-in actions shared by the Check in page and the Attendees table.
import type { DashboardEvent } from './events';
import { reportError } from './errorTracking';
import { addWalkIn, removeAttendee, setCheckedIn, type RosterAttendee } from './roster';
import { showToast } from './toast';

/**
 * Runs a save and, if it fails, says so in a toast and reports the error. Resolves to the save's
 * result, or undefined when it failed. Being offline isn't reported: that's the venue's Wi-Fi.
 */
export async function safely<T>(action: () => Promise<T>, failureMessage: string): Promise<T | undefined> {
	try {
		return await action();
	} catch (error) {
		showToast(failureMessage);
		if ((error as { code?: unknown } | null)?.code !== 'unavailable') reportError(error);
		return undefined;
	}
}

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
	// Shown at once, as the offline cache saves it at once. If the server turns it down, the cache
	// puts it back and the failure toast takes this one's place (one toast at a time).
	safely(() => setCheckedIn(event, attendee.id, true), `Couldn’t check ${name} in. Try again.`);
	showToast(`${name} checked in`, { label: 'Undo', onClick: () => undoCheckIn(event, attendee) });
}

export function undoCheckIn(event: DashboardEvent, attendee: RosterAttendee) {
	safely(() => setCheckedIn(event, attendee.id, false), `Couldn’t undo ${fullName(attendee)}’s check-in. Try again.`);
}

/** Takes a walk-in off the list, and out of the counts. */
export function removeWalkIn(event: DashboardEvent, attendee: RosterAttendee) {
	const name = fullName(attendee);
	safely(() => removeAttendee(event, attendee.id), `Couldn’t remove ${name}. Try again.`);
	showToast(`${name} removed`);
}

/**
 * Adds a walk-in, already checked in. Undo takes them off the list again. Taking the next
 * ticket number needs a connection, so offline it fails straight away and says so.
 */
export async function addWalkInAndCheckIn(event: DashboardEvent, person: Pick<RosterAttendee, 'firstName' | 'lastName' | 'email'>) {
	const name = fullName(person);
	const ticket = await safely(() => addWalkIn(event, person), `Couldn’t add ${name}. Check the connection and try again.`);
	if (ticket === undefined) return;
	showToast(`${name} checked in`, {
		label: 'Undo',
		onClick: () => safely(() => removeAttendee(event, ticket), `Couldn’t remove ${name}. Try again.`),
	});
}
