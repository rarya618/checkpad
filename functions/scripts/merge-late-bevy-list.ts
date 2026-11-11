// For an event whose Bevy list never got imported, so registered people checked in as
// walk-ins (three of the old app's events): imports the Bevy export, and turns each walk-in
// who registered before checking in into their ticket, keeping when they checked in and the
// name they typed. One ticket per email: extra tickets on an email are left out. Rows are
// read as the dashboard's import reads Bevy files (apps/dashboard/src/lib/attendeeImport.ts).
//
// After those events someone added the walk-ins to Bevy, so a walk-in's email being on the
// export doesn't mean they registered. Bevy ticket numbers go up over time, so a ticket was
// made about when the closest ticket numbered below it was paid for; a walk-in whose every ticket
// was made after they checked in stays a walk-in, and those tickets are left out. Pass the
// team's other Bevy exports with --timeline: one export has few tickets paid after its event.
//
// Lists what it would change unless given --write; then checks the event's counts. Safe to
// re-run: tickets already there are left alone. Emulator first, then production with gcloud
// application default credentials:
//   npm run merge-late-bevy-list -w @checkpad/functions -- --project checkpad-app --event gdg-sydney-june-meetup-2026 --csv june.csv --timeline july.csv --timeline august.csv
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentReference, type WriteBatch } from 'firebase-admin/firestore';
import { parseCsv } from '../../apps/dashboard/src/lib/csv.ts';
import type { AttendeeDoc, EventDoc } from '../src/model.ts';

const { values } = parseArgs({
	options: {
		project: { type: 'string' },
		event: { type: 'string' },
		csv: { type: 'string' },
		timeline: { type: 'string', multiple: true, default: [] },
		write: { type: 'boolean', default: false },
	},
});
const { project, event: slug, csv, timeline, write } = values;
if (!project || !slug || !csv) throw new Error('Pass --project, --event and --csv');

// Bevy's own columns (attendeeImport.ts); the rest are the organiser's registration questions
const BEVY_COLUMNS = new Set([
	'ordernumber', 'ticketnumber', 'firstname', 'lastname', 'email', 'twitter', 'company', 'title', 'featured', 'tickettitle',
	'ticketvenue', 'accesscode', 'discount', 'price', 'currency', 'numberoftickets', 'paidbyname', 'paidbyemail', 'paiddateutc',
	'checkindateutc', 'ticketpricepaid',
]);
const key = (header: string) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

interface Row {
	ticket: string;
	firstName: string;
	lastName: string;
	email: string;
	ticketType: string;
	hasOrder: boolean;
	answers: Record<string, string>;
}

function readBevy(file: string) {
	const [header, ...cells] = parseCsv(readFileSync(file, 'utf8')).filter((r) => r.some((c) => c.trim()));
	const col = (name: string) => {
		const i = header.map(key).indexOf(name);
		if (i < 0) throw new Error(`${file} has no ${name} column; is it a Bevy attendee export?`);
		return i;
	};
	return { header, cells, col };
}

// Ticket number → when it was paid for, from every export given, oldest number first
const ticketNumber = (ticket: string) => Number(ticket.replace(/\D/g, '')) || null;
const paid: [number, number][] = [];
for (const file of [csv, ...timeline]) {
	const { cells, col } = readBevy(file);
	const [t, p] = [col('ticketnumber'), col('paiddateutc')];
	for (const r of cells) {
		const n = ticketNumber(r[t] ?? '');
		const at = Date.parse((r[p] ?? '').trim());
		if (n && !Number.isNaN(at)) paid.push([n, at]);
	}
}
paid.sort((a, b) => a[0] - b[0]);
/** About the earliest the ticket was made: when the closest ticket numbered at or below it was paid for. */
function madeNoEarlierThan(ticket: string) {
	const n = ticketNumber(ticket);
	let at = -Infinity;
	if (n) for (const [k, t] of paid) if (k <= n) at = t;
	return at;
}

const { header, cells, col } = readBevy(csv);
const c = { ticket: col('ticketnumber'), first: col('firstname'), last: col('lastname'), email: col('email'), type: col('tickettitle'), order: col('ordernumber') };
const questions = header.map((h, i) => ({ i, q: h.trim() })).filter(({ q }) => q && !BEVY_COLUMNS.has(key(q)));
const seen = new Set<string>();
const rows: Row[] = [];
for (const r of cells) {
	const cell = (i: number) => (r[i] ?? '').trim();
	const row: Row = {
		ticket: cell(c.ticket),
		firstName: cell(c.first),
		lastName: cell(c.last),
		email: cell(c.email).toLowerCase(),
		ticketType: cell(c.type),
		hasOrder: Boolean(cell(c.order)),
		answers: Object.fromEntries(questions.map(({ i, q }) => [q, cell(i)]).filter(([, a]) => a)),
	};
	// The import's checks (attendeeImport.ts)
	if (!row.ticket || !row.email || !row.firstName || row.ticket.includes('/') || seen.has(row.ticket.toLowerCase())) {
		console.log(`Skipped a row: ${row.ticket || 'no ticket'} ${row.email || 'no email'}`);
		continue;
	}
	seen.add(row.ticket.toLowerCase());
	rows.push(row);
}

initializeApp({ projectId: project });
const db = getFirestore();
const [event] = (await db.collection('events').where('slug', '==', slug).get()).docs;
if (!event) throw new Error(`No event /${slug} in ${project}`);
const attendees = (await event.ref.collection('attendees').get()).docs;
const have = new Set(attendees.map((a) => a.id.toLowerCase()));

function attendeeDoc(row: Row, checkedIn?: Pick<AttendeeDoc, 'checkedInAt' | 'checkedInBy'>): AttendeeDoc {
	return {
		firstName: row.firstName,
		lastName: row.lastName,
		email: row.email,
		source: 'bevy',
		checkedInAt: checkedIn?.checkedInAt ?? null,
		...(checkedIn?.checkedInBy && { checkedInBy: checkedIn.checkedInBy }),
		...(row.ticketType && { ticketType: row.ticketType }),
		...(Object.keys(row.answers).length && { answers: row.answers }),
	};
}

// One ticket per email: people registered twice, under a handle and their name, and came once.
// Each gets a ticket with an order if they have one, else their first. Emails already on the
// list get nothing.
const onList = new Set(attendees.filter((a) => a.get('source') !== 'walk-in').map((a) => a.get('email') as string));
const pickFrom = (theirs: Row[]) => theirs.find((r) => r.hasOrder) ?? theirs[0];
const done = new Set<string>();
const converts: { walkIn: DocumentReference; ticket: string; doc: AttendeeDoc }[] = [];
let unmatched = 0;
let late = 0;
for (const a of attendees) {
	const w = a.data() as AttendeeDoc;
	if (w.source !== 'walk-in' || done.has(w.email) || onList.has(w.email)) continue;
	done.add(w.email);
	const theirs = rows.filter((r) => r.email === w.email && !have.has(r.ticket.toLowerCase()));
	if (!theirs.length) {
		unmatched++;
		continue;
	}
	// Only tickets that could have been made before they checked in
	const pick = pickFrom(theirs.filter((r) => madeNoEarlierThan(r.ticket) <= (w.checkedInAt?.toMillis() ?? Infinity)));
	if (!pick) {
		late++;
		continue;
	}
	converts.push({ walkIn: a.ref, ticket: pick.ticket, doc: { ...attendeeDoc(pick, { checkedInAt: w.checkedInAt, checkedInBy: w.checkedInBy }), firstName: w.firstName, lastName: w.lastName } });
}
const adds: Row[] = [];
for (const r of rows) {
	if (done.has(r.email) || onList.has(r.email)) continue;
	done.add(r.email);
	adds.push(pickFrom(rows.filter((x) => x.email === r.email && !have.has(x.ticket.toLowerCase()))) ?? r);
}
const already = rows.filter((r) => onList.has(r.email)).length;
const dropped = rows.length - converts.length - adds.length - already;

const before = event.get('counts') as EventDoc['counts'];
const expected = {
	registered: before.registered + adds.length,
	checkedIn: before.checkedIn,
	walkIns: before.walkIns - converts.length,
};
console.log(`/${slug}: ${rows.length} Bevy tickets. ${converts.length} walk-ins become their ticket, ${unmatched} not on the list and ${late} added to Bevy after checking in stay walk-ins, ${adds.length} tickets added as not arrived, ${dropped} extra tickets on the same email left out, ${already} already on the list.`);
console.log(`Counts: ${JSON.stringify(before)} → ${JSON.stringify(expected)}${write ? '' : ' (dry run)'}`);
if (!write) process.exit(0);

const writes: ((b: WriteBatch) => void)[] = [
	// The walk-in goes and their ticket comes in the same batch, so they're never counted twice
	...converts.map((x) => (b: WriteBatch) => b.create(event.ref.collection('attendees').doc(x.ticket), x.doc).delete(x.walkIn)),
	...adds.map((r) => (b: WriteBatch) => b.create(event.ref.collection('attendees').doc(r.ticket), attendeeDoc(r))),
];
for (let i = 0; i < writes.length; i += 200) {
	const batch = db.batch();
	for (const w of writes.slice(i, i + 200)) w(batch);
	await batch.commit();
}

// The trigger moves the counts a moment after each write
const same = (a: object, b: object) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
let counts = before;
for (let tries = 0; tries < 24 && !same(counts, expected); tries++) {
	await sleep(5000);
	counts = (await event.ref.get()).get('counts');
}
console.log(same(counts, expected) ? `✓ Counts: ${JSON.stringify(counts)}` : `✗ Counts are ${JSON.stringify(counts)}, expected ${JSON.stringify(expected)}`);
process.exit(same(counts, expected) ? 0 : 1);
