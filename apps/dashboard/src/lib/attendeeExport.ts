// The attendee list as a CSV: one for Bevy's bulk upload, and an attendance record for every
// other platform. Luma can't take check-ins or new guests from a file, so its organisers get
// the record. Imports from any platform are in attendeeImport.ts.
import { formatClockTime } from '@checkpad/shared/format';
import { downloadCsv } from './csv';
import type { DashboardEvent } from './events';
import { loadRoster, type RosterAttendee } from './roster';
import { showToast } from './toast';

const yesNo = (value: unknown) => (value ? 'Yes' : 'No');

function details(event: DashboardEvent, a: RosterAttendee) {
	return [
		a.firstName,
		a.lastName,
		a.email,
		a.ticket,
		a.ticketType ?? (a.walkIn ? event.walkInTicketTitle : ''),
		yesNo(a.walkIn),
		yesNo(a.checkedInAt),
		a.checkedInAt ? formatClockTime(a.checkedInAt, event.timeZone) : '',
	];
}

/** Figma's "Export for Bevy": the attendee list as a CSV for Bevy's bulk upload, walk-ins included. */
function bevyCsv(event: DashboardEvent, roster: RosterAttendee[]) {
	downloadCsv(`${event.slug}-attendees.csv`, [
		['First Name', 'Last Name', 'Email', 'Ticket Number', 'Ticket Type', 'Walk-in', 'Checked In', 'Checked In At'],
		...roster.map((a) => details(event, a)),
	]);
}

/** Who registered and who came, from any platform, with the answers to its registration questions. */
function attendanceCsv(event: DashboardEvent, roster: RosterAttendee[]) {
	const questions = [...new Set(roster.flatMap((a) => Object.keys(a.answers ?? {})))];
	downloadCsv(`${event.slug}-attendance.csv`, [
		['First Name', 'Last Name', 'Email', 'Ticket or Guest ID', 'Ticket Type', 'Walk-in', 'Checked In', 'Checked In At', ...questions],
		...roster.map((a) => [...details(event, a), ...questions.map((q) => a.answers?.[q] ?? '')]),
	]);
}

/** Fetches the event's attendees, then downloads them as a CSV. */
async function exportWith(event: DashboardEvent, write: (event: DashboardEvent, roster: RosterAttendee[]) => void) {
	try {
		write(event, await loadRoster(event));
	} catch {
		showToast('Couldn’t export the attendees. Check the connection and try again.');
	}
}

export const exportForBevy = (event: DashboardEvent) => exportWith(event, bevyCsv);
export const exportAttendance = (event: DashboardEvent) => exportWith(event, attendanceCsv);
