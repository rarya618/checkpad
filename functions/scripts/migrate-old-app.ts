// Moves one team's events and attendees from the old app's Realtime Database export into
// Firestore (docs/migration-plan.md, Data model and migration). Export the old database first:
//   npx -y firebase-tools@latest database:get / --project gdg-syd-check-in --instance gdg-syd-check-in-default-rtdb > old.json
//
// --from-team is the old team's slug, name or ID (--from-team=-Oqx…, since IDs start with a
// dash), --to-team the Checkpad team's document ID. Old events
// have only a date, so every event gets the same --start and --end, in Sydney time.
// Lists what it would write unless given --write; then checks each event's counts. Safe to
// re-run: an event already migrated (by legacyId) only gets the attendees it's missing.
//
// Emulator first (with the emulators running), then production with gcloud application
// default credentials:
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run migrate-old-app -w @checkpad/functions -- --project demo-checkpad --export old.json --from-team gdg-sydney --to-team gdg-sydney --start 17:30 --end 20:30 --write
//   npm run migrate-old-app -w @checkpad/functions -- --project checkpad-app --export old.json --from-team gdg-sydney --to-team ZHWQ… --start 17:30 --end 20:30
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import type { AttendeeDoc, EventDoc, SlugDoc } from '../src/model.ts';

const TIME_ZONE = 'Australia/Sydney';
const PREFIX = 'GDGWALKIN';
// packages/shared/src/events.ts, which functions can't import
const RESERVED_SLUGS = new Set(['api', 'check-in', 'privacy', 'team']);

interface OldAttendee {
	ticketNumber: string;
	firstName: string;
	lastName: string;
	email: string;
	source: 'bevy' | 'walk-in';
	checkinDate?: string;
	jobTitle?: string;
	company?: string;
	ticketType?: string;
	ticketTitle?: string;
	ticketVenue?: string;
	bevyOrderNumber?: string;
}
interface OldEvent {
	name: string;
	date: string;
	description?: string;
	ticketCounter?: number;
	walkInTicketTitle?: string;
	walkInTicketVenue?: string;
	assignedTeams?: Record<string, true>;
	attendees?: Record<string, OldAttendee>;
}

const { values } = parseArgs({
	options: {
		project: { type: 'string' },
		export: { type: 'string' },
		'from-team': { type: 'string' },
		'to-team': { type: 'string' },
		start: { type: 'string' },
		end: { type: 'string' },
		write: { type: 'boolean', default: false },
	},
});
const { project, export: file, 'from-team': oldTeam, 'to-team': toTeam, start, end, write } = values;
if (!project || !file || !oldTeam || !toTeam || !start || !end) throw new Error('Pass --project, --export, --from-team, --to-team, --start and --end');
for (const t of [start, end]) if (!/^\d\d:\d\d$/.test(t)) throw new Error(`Times are HH:MM, 24-hour: ${t}`);
if (end <= start) throw new Error('--end should be after --start');

initializeApp({ projectId: project });
const db = getFirestore();
if (!(await db.doc(`teams/${toTeam}`).get()).exists) throw new Error(`No team ${toTeam} in ${project}`);

const old = JSON.parse(readFileSync(file, 'utf8')) as { events: Record<string, OldEvent>; teams: Record<string, { name: string; slug?: string }> };
const matches = Object.entries(old.teams).filter(([id, t]) => [id, t.slug, t.name].includes(oldTeam));
if (matches.length !== 1) throw new Error(`${matches.length} teams in the export match ${oldTeam}`);
const [[fromTeam]] = matches;
const events = Object.entries(old.events)
	.filter(([, e]) => e.assignedTeams?.[fromTeam])
	.sort(([, a], [, b]) => a.date.localeCompare(b.date));

const migrated = new Map<string, DocumentReference>();
for (const doc of (await db.collection('events').where('legacyId', '!=', null).get()).docs) migrated.set(doc.get('legacyId'), doc.ref);
const takenSlugs = new Set([...RESERVED_SLUGS, ...(await db.collection('slugs').listDocuments()).map((d) => d.id)]);

/** The name as a link, like the dashboard's, with -2, -3… if it's taken. */
function newSlug(name: string) {
	const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	let slug = base;
	for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
	takenSlugs.add(slug);
	return slug;
}

/** The instant when Sydney's clocks show `date` `time` (the dashboard's zonedToDate). */
function sydney(date: string, time: string) {
	const wall = Date.parse(`${date}T${time}:00Z`);
	const format = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
	let utc = wall;
	for (let i = 0; i < 2; i++) {
		const p = Object.fromEntries(format.formatToParts(new Date(utc)).map((x) => [x.type, x.value]));
		utc += wall - Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`);
	}
	return Timestamp.fromMillis(utc);
}

/**
 * The old app saved Bevy's columns one off: its ticketType is the job title, its jobTitle the
 * Twitter handle (dropped, as Checkpad's import does), and its ticketTitle the ticket type.
 */
function attendeeDoc(a: OldAttendee): AttendeeDoc {
	return {
		firstName: a.firstName.trim(),
		lastName: a.lastName.trim(),
		email: a.email.trim().toLowerCase(),
		source: a.source,
		checkedInAt: a.checkinDate ? Timestamp.fromDate(new Date(a.checkinDate)) : null,
		...(a.ticketTitle && { ticketType: a.ticketTitle }),
		...(a.ticketType && { jobTitle: a.ticketType }),
		...(a.company && { company: a.company }),
		...(a.ticketVenue && { ticketVenue: a.ticketVenue }),
		...(a.bevyOrderNumber && { bevyOrderNumber: a.bevyOrderNumber }),
	};
}

function tally(attendees: OldAttendee[]) {
	return {
		registered: attendees.length,
		checkedIn: attendees.filter((a) => a.checkinDate).length,
		walkIns: attendees.filter((a) => a.source === 'walk-in').length,
	};
}

console.log(`${events.length} events of ${old.teams[fromTeam].name} → teams/${toTeam} in ${project}, ${start}–${end} ${TIME_ZONE}${write ? '' : ' (dry run)'}\n`);
const written: { ref: DocumentReference; name: string; expected: ReturnType<typeof tally> }[] = [];

for (const [legacyId, e] of events) {
	const attendees = Object.values(e.attendees ?? {});
	for (const a of attendees) if (a.source === 'walk-in' && !new RegExp(`^${PREFIX}\\d{4}$`).test(a.ticketNumber)) throw new Error(`${e.name}: walk-in ticket ${a.ticketNumber}`);
	const expected = tally(attendees);
	const existing = migrated.get(legacyId);
	const ref = existing ?? db.collection('events').doc();
	let toWrite = attendees;

	if (existing) {
		const have = new Set((await ref.collection('attendees').listDocuments()).map((d) => d.id));
		toWrite = attendees.filter((a) => !have.has(a.ticketNumber));
		console.log(`= ${e.date} ${e.name}: already migrated (${ref.id}), ${toWrite.length} attendees missing`);
	} else {
		const walkIns = attendees.filter((a) => a.source === 'walk-in').map((a) => Number(a.ticketNumber.slice(PREFIX.length)));
		const doc: EventDoc = {
			slug: newSlug(e.name),
			name: e.name,
			description: e.description ?? '',
			// Every old event is over; one was reopened in the old app since (12 November 2026)
			status: 'closed',
			startsAt: sydney(e.date, start),
			endsAt: sydney(e.date, end),
			timeZone: TIME_ZONE,
			teamIds: [toTeam],
			// The countAttendees trigger counts the attendees written below
			counts: { registered: 0, checkedIn: 0, walkIns: 0 },
			walkInCounter: Math.max(e.ticketCounter ?? 0, ...walkIns, 0),
			walkInTicketPrefix: PREFIX,
			selfWalkIns: true,
			legacyId,
			...(e.walkInTicketTitle && { walkInTicketTitle: e.walkInTicketTitle }),
			...(e.walkInTicketVenue && { walkInVenue: e.walkInTicketVenue }),
		};
		console.log(`+ ${e.date} ${e.name} → /${doc.slug}: ${expected.registered} attendees, ${expected.checkedIn} checked in, ${expected.walkIns} walk-ins`);
		if (write) {
			const batch = db.batch();
			batch.create(ref, doc);
			batch.create(db.doc(`slugs/${doc.slug}`), { eventId: ref.id } satisfies SlugDoc);
			await batch.commit();
		}
	}
	if (!write) continue;
	for (let i = 0; i < toWrite.length; i += 500) {
		const batch = db.batch();
		// Creates, so a re-run never overwrites someone checked in on Checkpad since
		for (const a of toWrite.slice(i, i + 500)) batch.create(ref.collection('attendees').doc(a.ticketNumber), attendeeDoc(a));
		await batch.commit();
	}
	written.push({ ref, name: e.name, expected });
}

if (!write) {
	console.log('\nRun again with --write to save.');
	process.exit(0);
}

// The trigger counts each attendee a moment after it's written: wait until every event's
// counts match the export, or stop moving.
console.log('\nWaiting for the counts…');
const same = (a: object, b: object) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
let last = '';
let still = 0;
let counts: EventDoc['counts'][] = [];
while (still < 6) {
	counts = await Promise.all(written.map(async (w) => (await w.ref.get()).get('counts') as EventDoc['counts']));
	if (written.every((w, i) => same(w.expected, counts[i]))) break;
	const now = JSON.stringify(counts);
	still = now === last ? still + 1 : 0;
	last = now;
	await sleep(5000);
}
let wrong = 0;
for (const [i, w] of written.entries()) {
	const ok = same(w.expected, counts[i]);
	if (!ok) wrong++;
	const c = counts[i];
	console.log(`${ok ? '✓' : '✗'} ${w.name}: ${c.registered}/${w.expected.registered} attendees, ${c.checkedIn}/${w.expected.checkedIn} checked in, ${c.walkIns}/${w.expected.walkIns} walk-ins`);
}
console.log(wrong ? `\n${wrong} events' counts don't match the export.` : `\nAll ${written.length} events match the export.`);
process.exit(wrong ? 1 : 0);
