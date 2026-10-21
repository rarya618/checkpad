// Bevy attendee CSVs: reading an export into an import plan, and writing the attendee list back out.
import { formatClockTime } from '@checkpad/shared/format';
import { downloadCsv, parseCsv } from './csv';
import type { DashboardEvent } from './events';
import { looksLikeEmail } from './checkIn';
import { loadRoster, type RosterAttendee } from './roster';
import { showToast } from './toast';

export interface BevyRow {
	firstName: string;
	lastName: string;
	email: string;
	ticket: string;
	ticketType: string;
}

export interface ImportPlan {
	fileName: string;
	rowCount: number;
	added: BevyRow[];
	updated: BevyRow[];
	unchanged: number;
	/** Reason → spreadsheet row numbers (the header is row 1). */
	skipped: Map<string, number[]>;
}

export type ImportError =
	| { kind: 'not-csv'; fileName: string; fileType: string }
	| { kind: 'missing-columns'; fileName: string; missing: string[] };

// Column names vary between Bevy exports ("First Name", "first_name", "Ticket ID"…),
// so match on letters and digits only.
const columns = {
	firstName: ['firstname', 'first', 'givenname'],
	lastName: ['lastname', 'last', 'surname', 'familyname'],
	email: ['email', 'emailaddress'],
	ticket: ['ticketnumber', 'ticketno', 'ticketid', 'ticket', 'barcode', 'ordernumber'],
	ticketType: ['tickettitle', 'tickettype', 'ticketname'],
} as const;
const required = { firstName: 'first name', lastName: 'last name', email: 'email', ticket: 'ticket number' } as const;

const key = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

/** "Excel file" for .xlsx, or the extension in capitals. */
function fileType(name: string) {
	const ext = name.split('.').pop()?.toLowerCase() ?? '';
	if (ext === 'xlsx' || ext === 'xls') return 'Excel file';
	if (ext === 'numbers') return 'Numbers file';
	return ext ? `${ext.toUpperCase()} file` : 'File';
}

export async function planImport(file: File, roster: RosterAttendee[]): Promise<ImportPlan | ImportError> {
	if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
		return { kind: 'not-csv', fileName: file.name, fileType: fileType(file.name) };
	}
	const [header = [], ...rows] = parseCsv(await file.text()).filter((r) => r.some((c) => c.trim() !== ''));
	const keys = header.map(key);
	const index = Object.fromEntries(
		Object.entries(columns).map(([field, names]) => [field, keys.findIndex((k) => (names as readonly string[]).includes(k))]),
	) as Record<keyof typeof columns, number>;
	const missing = (Object.keys(required) as (keyof typeof required)[]).filter((f) => index[f] < 0).map((f) => required[f]);
	if (missing.length) return { kind: 'missing-columns', fileName: file.name, missing };

	const byTicket = new Map(roster.filter((a) => a.ticket).map((a) => [a.ticket!.toLowerCase(), a]));
	const seen = new Set<string>();
	const plan: ImportPlan = { fileName: file.name, rowCount: rows.length, added: [], updated: [], unchanged: 0, skipped: new Map() };
	const skip = (reason: string, row: number) => plan.skipped.set(reason, [...(plan.skipped.get(reason) ?? []), row]);

	rows.forEach((cells, i) => {
		const get = (f: keyof typeof columns) => (index[f] >= 0 ? (cells[index[f]] ?? '').trim() : '');
		const row: BevyRow = { firstName: get('firstName'), lastName: get('lastName'), email: get('email'), ticket: get('ticket'), ticketType: get('ticketType') };
		const rowNumber = i + 2;
		if (!row.email) return skip('No email address', rowNumber);
		// The rest match what the database accepts (firestore.rules), so one bad row can't stop the import
		if (!looksLikeEmail(row.email)) return skip('Email address isn’t valid', rowNumber);
		row.email = row.email.toLowerCase();
		if (!row.firstName) return skip('No first name', rowNumber);
		if (row.firstName.length > 100 || row.lastName.length > 100 || row.ticketType.length > 100) return skip('Name or ticket type is too long', rowNumber);
		if (!row.ticket) return skip('No ticket number', rowNumber);
		if (row.ticket.length > 100 || row.ticket.includes('/') || /^\.\.?$|^__.*__$/.test(row.ticket)) return skip('Ticket number can’t be used', rowNumber);
		if (seen.has(row.ticket.toLowerCase())) return skip('Same ticket number as an earlier row', rowNumber);
		seen.add(row.ticket.toLowerCase());

		const existing = byTicket.get(row.ticket.toLowerCase());
		if (!existing) plan.added.push(row);
		else if (existing.firstName !== row.firstName || existing.lastName !== row.lastName || (row.ticketType && existing.ticketType !== row.ticketType))
			plan.updated.push(row);
		else plan.unchanged++;
	});
	return plan;
}

export function importCount(plan: ImportPlan) {
	return plan.added.length + plan.updated.length + plan.unchanged;
}

export function skippedCount(plan: ImportPlan) {
	return [...plan.skipped.values()].reduce((n, rows) => n + rows.length, 0);
}

/** "rows 18, 47 and 90" */
export function rowList(rows: number[]) {
	if (rows.length === 1) return `row ${rows[0]}`;
	return `rows ${rows.slice(0, -1).join(', ')} and ${rows[rows.length - 1]}`;
}

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
