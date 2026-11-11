// For an event whose Bevy list never got imported, so registered people checked in as
// walk-ins (three of the old app's events): imports the Bevy export, and turns each walk-in
// whose email is on it into that person's ticket, keeping when they checked in. Rows are
// read as the dashboard's import reads Bevy files (apps/dashboard/src/lib/attendeeImport.ts).
//
// Lists what it would change unless given --write; then checks the event's counts. Safe to
// re-run: tickets already there are left alone. Emulator first, then production with gcloud
// application default credentials:
//   npm run merge-late-bevy-list -w @checkpad/functions -- --project checkpad-app --event gdg-sydney-june-meetup-2026 --csv bevy.csv
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
		write: { type: 'boolean', default: false },
	},
});
const { project, event: slug, csv, write } = values;
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
	bevyCheckedIn: boolean;
	answers: Record<string, string>;
}

const [header, ...cells] = parseCsv(readFileSync(csv, 'utf8')).filter((r) => r.some((c) => c.trim()));
const col = (name: string) => {
	const i = header.map(key).indexOf(name);
	if (i < 0) throw new Error(`${csv} has no ${name} column; is it a Bevy attendee export?`);
	return i;
};
const c = { ticket: col('ticketnumber'), first: col('firstname'), last: col('lastname'), email: col('email'), type: col('tickettitle'), order: col('ordernumber'), checkin: col('checkindateutc') };
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
		bevyCheckedIn: Boolean(cell(c.checkin)),
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

// Each walk-in becomes one of their tickets: the one Bevy has as checked in, else one with
// an order, else the first. Their other tickets come in as not arrived, as an import adds them.
const used = new Set<string>();
const converts: { walkIn: DocumentReference; ticket: string; doc: AttendeeDoc }[] = [];
let unmatched = 0;
for (const a of attendees) {
	const w = a.data() as AttendeeDoc;
	if (w.source !== 'walk-in') continue;
	const theirs = rows.filter((r) => r.email === w.email && !have.has(r.ticket.toLowerCase()) && !used.has(r.ticket));
	const pick = theirs.find((r) => r.bevyCheckedIn) ?? theirs.find((r) => r.hasOrder) ?? theirs[0];
	if (!pick) {
		unmatched++;
		continue;
	}
	used.add(pick.ticket);
	converts.push({ walkIn: a.ref, ticket: pick.ticket, doc: attendeeDoc(pick, { checkedInAt: w.checkedInAt, checkedInBy: w.checkedInBy }) });
}
const adds = rows.filter((r) => !have.has(r.ticket.toLowerCase()) && !used.has(r.ticket));

const before = event.get('counts') as EventDoc['counts'];
const expected = {
	registered: before.registered + adds.length,
	checkedIn: before.checkedIn,
	walkIns: before.walkIns - converts.length,
};
console.log(`/${slug}: ${rows.length} Bevy tickets. ${converts.length} walk-ins become their ticket, ${unmatched} not on the list stay walk-ins, ${adds.length} tickets added as not arrived.`);
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
