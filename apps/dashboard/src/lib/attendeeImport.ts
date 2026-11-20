// Attendee CSVs from registration platforms, read into an import plan. Columns are matched
// by name, never by platform, so Bevy, Luma, Humanitix and lookalike exports go through the same steps.
// Anything with a meaning beyond its name hangs off a column too: a status column filters
// out the waitlist, a lone name column is split. The platform is recognised only to name it
// in the dialog and to record where each attendee came from (`source`).
import { parseCsv } from './csv';
import { looksLikeEmail } from './checkIn';
import type { RosterAttendee } from './roster';

export type ImportSource = 'bevy' | 'luma' | 'humanitix' | 'csv';

export const sourceName: Record<ImportSource, string> = { bevy: 'Bevy', luma: 'Luma', humanitix: 'Humanitix', csv: 'CSV' };

export interface ImportRow {
	firstName: string;
	lastName: string;
	email: string;
	/**
	 * Ticket number, or the platform's ID for the person when it has no tickets (Luma's guest_id).
	 * Humanitix numbers tickets within an order ("2nd"), so theirs is the order ID and that number.
	 */
	ticket: string;
	ticketType: string;
	/** Question → answer, for the file's registration questions; blank answers left out. */
	answers: Record<string, string>;
	/** When they registered on the platform; absent when the file has no date we can read. */
	registeredAt?: Date;
}

export interface ImportPlan {
	fileName: string;
	source: ImportSource;
	rowCount: number;
	/** The registration questions whose answers are saved, as the file's column headers. */
	questions: string[];
	added: ImportRow[];
	updated: ImportRow[];
	unchanged: number;
	/** Reason → spreadsheet row numbers (the header is row 1). */
	skipped: Map<string, number[]>;
}

export type ImportError =
	| { kind: 'not-csv'; fileName: string; fileType: string }
	| { kind: 'missing-columns'; fileName: string; missing: string[] };

// Headers vary between exports ("First Name", "first_name"…), so they're compared on letters
// and digits only. Each list is in order of preference: the first one the file has wins, so
// Bevy's "Ticket number" beats its "Order number", which one person's tickets share.
const columns = {
	firstName: ['firstname', 'first', 'givenname'],
	lastName: ['lastname', 'last', 'surname', 'familyname'],
	name: ['name', 'fullname', 'attendeename', 'guestname'],
	email: ['email', 'emailaddress'],
	ticket: ['ticketnumber', 'ticketno', 'ticketid', 'barcode', 'ticket', 'guestid', 'attendeeid', 'registrationid', 'ordernumber'],
	ticketType: ['tickettitle', 'tickettype', 'ticketname'],
	status: ['approvalstatus', 'attendeestatus', 'registrationstatus', 'status'],
	// Luma's created_at, Bevy's "Paid date (UTC)", Humanitix's "Order date & time"
	registeredAt: ['registeredat', 'registrationdate', 'registrationtime', 'createdat', 'orderdate', 'orderdatetime', 'paiddateutc', 'paiddate'],
	// The time zone of a registration date that doesn't carry one (Humanitix's "AEDT")
	timeZone: ['timezone'],
	// What a ticket number counts within, when it's "1st", "2nd"… (Humanitix's "Order id")
	order: ['orderid'],
} as const;
type Column = keyof typeof columns;

// Columns the platforms add themselves. They aren't the organiser's questions, and some
// (phone numbers, payments, wallets, ad clicks) aren't Checkpad's to keep.
const platformColumns = new Set([
	// Bevy
	'ordernumber', 'ticketnumber', 'twitter', 'company', 'title', 'featured', 'tickettitle', 'ticketvenue', 'accesscode',
	'discount', 'price', 'currency', 'numberoftickets', 'paidbyname', 'paidbyemail', 'paiddateutc', 'checkindateutc',
	'ticketpricepaid',
	// Luma
	'guestid', 'phonenumber', 'createdat', 'approvalstatus', 'checkedinat', 'utmsource', 'utmmedium', 'utmcampaign',
	'utmterm', 'utmcontent', 'googleclickid', 'metaclickid', 'xclickid', 'linkedinclickid', 'tiktokclickid',
	'redditclickid', 'yandexclickid', 'referrer', 'referredby', 'qrcodeurl', 'amount', 'amounttax', 'amountdiscount',
	'couponcode', 'ethaddress', 'solanaaddress', 'surveyresponserating', 'surveyresponsefeedback', 'tickettypeid',
	'ticketname',
	// Humanitix
	'event', 'seatinglocation', 'tablenumber', 'seatnumber', 'seatnote', 'reportinggroup', 'package', 'orderid', 'ticketno',
	'orderdatetime', 'timezone', 'buyerfirstname', 'buyerlastname', 'buyermobile', 'buyeremail', 'paid',
	'humanitixpassedonfees', 'humanitixabsorbedfees', 'amexsurcharge', 'customtax', 'zipfeeabsorbed',
	'afterpayfeeabsorbed', 'refunds', 'feerebate', 'yourearnings', 'refundedfees', 'discountcodeused', 'discountredeemed',
	'taxonsales', 'taxonbookingfees', 'gateway', 'accesscodeused', 'checkedin', 'checkedindate', 'eventdate', 'eventtime',
	'qrcodedata', 'saleschannel', 'ordernotes',
]);
// The same kinds of columns from platforms not listed above. Only checked against short
// headers, so a question like "What do you hope to learn?" never matches by accident.
const platformLike = /phone|mobile|address|postcode|zip|card|price|amount|paid|payment|tax|discount|coupon|currency|order|utm|click|referr|wallet|qrcode|date|time|createdat|^id$|guestid|attendeeid|userid|uuid/;

// Statuses that mean the person is coming. A blank status counts as coming.
const coming = new Set(['', 'approved', 'going', 'attending', 'confirmed', 'registered', 'checkedin', 'active', 'valid', 'complete', 'completed']);
const notComing: Record<string, string> = {
	waitlist: 'On the waitlist',
	waitlisted: 'On the waitlist',
	pendingapproval: 'Waiting for approval',
	pending: 'Waiting for approval',
	declined: 'Declined',
	invited: 'Invited but not registered',
	notgoing: 'Not going',
	cancelled: 'Cancelled',
	canceled: 'Cancelled',
	refunded: 'Refunded',
};

const MAX_QUESTIONS = 50; // firestore.rules
const MAX_QUESTION = 300;
const MAX_ANSWER = 1000;

const key = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

function detectSource(keys: string[]): ImportSource {
	const has = (k: string) => keys.includes(k);
	if (has('guestid') && (has('approvalstatus') || has('qrcodeurl'))) return 'luma';
	if (has('ticketnumber') && (has('ordernumber') || has('tickettitle'))) return 'bevy';
	if (has('qrcodedata') || (has('orderid') && has('ticketno') && has('buyeremail'))) return 'humanitix';
	return 'csv';
}

/** "Excel file" for .xlsx, or the extension in capitals. */
function fileType(name: string) {
	const ext = name.split('.').pop()?.toLowerCase() ?? '';
	if (ext === 'xlsx' || ext === 'xls') return 'Excel file';
	if (ext === 'numbers') return 'Numbers file';
	return ext ? `${ext.toUpperCase()} file` : 'File';
}

/** "Mary Jane Smith" → ["Mary Jane", "Smith"]; one word is a first name only. */
function splitName(name: string): [string, string] {
	const words = name.split(/\s+/).filter(Boolean);
	if (words.length < 2) return [words[0] ?? '', ''];
	return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

// The time zones Humanitix's events are in, as it abbreviates them, and their UTC offsets
const zoneOffsets: Record<string, string> = {
	UTC: 'Z', GMT: 'Z', BST: '+01:00', AWST: '+08:00', ACST: '+09:30', ACDT: '+10:30', AEST: '+10:00', AEDT: '+11:00',
	NZST: '+12:00', NZDT: '+13:00', HST: '-10:00', AKST: '-09:00', AKDT: '-08:00', PST: '-08:00', PDT: '-07:00',
	MST: '-07:00', MDT: '-06:00', CST: '-06:00', CDT: '-05:00', EST: '-05:00', EDT: '-04:00',
};

/**
 * "2026-08-21T03:12:45.123Z" (Luma), "2026-08-21 03:12:45" (Bevy) or "2026-08-21 1:12 pm"
 * (Humanitix), UTC unless it or `zone` says otherwise. Anything else is left out rather than
 * guessed: "08/09/2026" could be either month, and so could a time zone we don't know.
 */
export function parseRegisteredAt(text: string, zone = ''): Date | undefined {
	const m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(\.\d+)?)?\s*([ap]m)?)?\s*(Z|[A-Z]{3,4}|[+-]\d{2}:?\d{2})?$/i);
	if (!m) return undefined;
	const [, y, mo, d, hour = '0', mi = '00', s = '00', frac = '', meridiem, ownZone] = m;
	let h = Number(hour);
	if (meridiem) {
		if (h < 1 || h > 12) return undefined;
		h = (h % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
	}
	const z = (ownZone ?? zone.trim()) || 'Z';
	const offset = /^[+-]/.test(z) ? z.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2') : z.toUpperCase() === 'Z' ? 'Z' : zoneOffsets[z.toUpperCase()];
	if (!offset) return undefined;
	const date = new Date(`${y}-${mo}-${d}T${String(h).padStart(2, '0')}:${mi}:${s}${frac}${offset}`);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Same questions and answers, whatever their order. */
function sameAnswers(a: Record<string, string> = {}, b: Record<string, string> = {}) {
	const ak = Object.keys(a);
	return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k]);
}

export async function planImport(file: File, roster: RosterAttendee[]): Promise<ImportPlan | ImportError> {
	if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') {
		return { kind: 'not-csv', fileName: file.name, fileType: fileType(file.name) };
	}
	return planFromText(file.name, await file.text(), roster);
}

export function planFromText(fileName: string, text: string, roster: Pick<RosterAttendee, 'ticket' | 'email' | 'firstName' | 'lastName' | 'ticketType' | 'answers' | 'registeredAt'>[]): ImportPlan | ImportError {
	const [header = [], ...rows] = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
	const keys = header.map(key);
	const index = Object.fromEntries(
		(Object.keys(columns) as Column[]).map((c) => {
			const found = (columns[c] as readonly string[]).find((name) => keys.includes(name));
			return [c, found ? keys.indexOf(found) : -1];
		}),
	) as Record<Column, number>;

	const missing = [
		...(index.firstName < 0 && index.name < 0 ? ['first name'] : []),
		...(index.email < 0 ? ['email'] : []),
		...(index.ticket < 0 ? ['ticket number'] : []),
	];
	if (missing.length) return { kind: 'missing-columns', fileName, missing };

	// Every other column with a header is one of the organiser's questions
	const used = new Set(Object.values(index));
	const questionColumns: { col: number; question: string }[] = [];
	const seenQuestions = new Set<string>();
	header.forEach((h, col) => {
		const question = h.trim().slice(0, MAX_QUESTION);
		const k = keys[col];
		if (used.has(col) || !k || platformColumns.has(k) || /^__.*__$/.test(question) || seenQuestions.has(question)) return;
		if (question.split(/\s+/).length <= 3 && platformLike.test(k)) return;
		if (questionColumns.length >= MAX_QUESTIONS) return;
		seenQuestions.add(question);
		questionColumns.push({ col, question });
	});

	const byTicket = new Map(roster.filter((a) => a.ticket).map((a) => [a.ticket!.toLowerCase(), a]));
	// One ticket per person: people register twice (once under an account handle, say), and the
	// counts and turnout are per person. Walk-ins count too, so a late list doesn't add them again.
	const onList = new Set(roster.map((a) => a.email.toLowerCase()));
	const seen = new Set<string>();
	const seenEmails = new Set<string>();
	const plan: ImportPlan = {
		fileName,
		source: detectSource(keys),
		rowCount: rows.length,
		questions: questionColumns.map((q) => q.question),
		added: [],
		updated: [],
		unchanged: 0,
		skipped: new Map(),
	};
	const skip = (reason: string, row: number) => plan.skipped.set(reason, [...(plan.skipped.get(reason) ?? []), row]);

	rows.forEach((cells, i) => {
		const cell = (col: number) => (col >= 0 ? (cells[col] ?? '').trim() : '');
		const rowNumber = i + 2;

		const status = cell(index.status);
		if (!coming.has(key(status))) return skip(notComing[key(status)] ?? `Status is “${status}”`, rowNumber);

		let firstName = cell(index.firstName);
		let lastName = cell(index.lastName);
		if (!firstName && index.name >= 0) [firstName, lastName] = splitName(cell(index.name));
		const answers: Record<string, string> = {};
		for (const { col, question } of questionColumns) {
			const answer = cell(col).slice(0, MAX_ANSWER);
			if (answer) answers[question] = answer;
		}
		// "2nd" in an order is a ticket number only with the order's ID: "S6TFX6HG-2"
		let ticket = cell(index.ticket);
		const nth = ticket.match(/^(\d+)(?:st|nd|rd|th)$/i);
		if (nth && cell(index.order)) ticket = `${cell(index.order)}-${Number(nth[1])}`;
		const row: ImportRow = { firstName, lastName, email: cell(index.email), ticket, ticketType: cell(index.ticketType), answers };
		const registeredAt = parseRegisteredAt(cell(index.registeredAt), cell(index.timeZone));
		if (registeredAt) row.registeredAt = registeredAt;

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
		// A ticket already on the list is updated whatever its email; a new one needs a new email
		if (!existing && onList.has(row.email)) return skip('Already on the list with another ticket', rowNumber);
		if (!existing && seenEmails.has(row.email)) return skip('Same email as an earlier row', rowNumber);
		seenEmails.add(row.email);
		if (!existing) plan.added.push(row);
		else if (
			existing.firstName !== row.firstName ||
			existing.lastName !== row.lastName ||
			(row.ticketType && existing.ticketType !== row.ticketType) ||
			(plan.questions.length > 0 && !sameAnswers(existing.answers, row.answers)) ||
			// Lists imported before Checkpad kept registration dates get them on the next import
			(row.registeredAt && existing.registeredAt?.getTime() !== row.registeredAt.getTime())
		)
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
