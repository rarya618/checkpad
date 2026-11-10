// The attendee list as a CSV for Bevy's bulk upload. Imports from any platform are in attendeeImport.ts.
import { formatClockTime } from '@checkpad/shared/format';
import { downloadCsv } from './csv';
import type { DashboardEvent } from './events';
import { loadRoster, type RosterAttendee } from './roster';
import { showToast } from './toast';

/** Figma's "Export for Bevy": the attendee list as a CSV for Bevy's bulk upload, walk-ins included. */
function exportForBevy(event: DashboardEvent, roster: RosterAttendee[]) {
	downloadCsv(`${event.slug}-attendees.csv`, [
		['First Name', 'Last Name', 'Email', 'Ticket Number', 'Ticket Type', 'Walk-in', 'Checked In', 'Checked In At'],
		...roster.map((a) => [
			a.firstName,
			a.lastName,
			a.email,
			a.ticket,
			a.ticketType ?? (a.walkIn ? event.walkInTicketTitle : ''),
			a.walkIn ? 'Yes' : 'No',
			a.checkedInAt ? 'Yes' : 'No',
			a.checkedInAt ? formatClockTime(a.checkedInAt, event.timeZone) : '',
		]),
	]);
}

/** Downloads the event's attendee list as a Bevy CSV, fetching it first. */
export async function exportAttendees(event: DashboardEvent) {
	try {
		exportForBevy(event, await loadRoster(event));
	} catch {
		showToast('Couldn’t export the attendees. Check the connection and try again.');
	}
}
