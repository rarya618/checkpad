// Load test for a rush of check-ins at the start of an event, against real Firestore (the
// emulator doesn't model contention). Runs the API's own code: every attempt first bumps the
// rate limit counter, then checks someone in or adds a walk-in, all from one IP address as on
// venue Wi-Fi. That makes two documents everyone writes to: the event (its walk-in counter)
// and the rate limit counter. The event's counts are kept by a trigger (countAttendees), which
// doesn't run here; it uses increments, which don't contend.
//
// Needs a Firestore database you can throw away, and gcloud application default credentials:
//   npx -y firebase-tools@latest firestore:databases:create loadtest --location australia-southeast1 --project checkpad-app
//   CHECKIN_RATE_LIMIT=100000 npm run load-test -w @checkpad/functions -- --project checkpad-app --database loadtest --rate 5 --seconds 60
//   npx -y firebase-tools@latest firestore:databases:delete loadtest --project checkpad-app
// It refuses to touch the (default) database. CHECKIN_RATE_LIMIT lifts the limit so it
// doesn't refuse the test's own attempts.
import { parseArgs } from 'node:util';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { ApiFailure, checkIn, walkIn } from '../src/checkin.ts';
import { allowAttempt } from '../src/rateLimit.ts';

const { values } = parseArgs({
	options: {
		project: { type: 'string' },
		database: { type: 'string' },
		rate: { type: 'string', default: '5' },
		seconds: { type: 'string', default: '60' },
		'walk-ins': { type: 'string', default: '0.2' },
	},
});
const { project, database } = values;
if (!project || !database) throw new Error('Pass --project and --database');
if (database === '(default)') throw new Error('Not the (default) database: create a throwaway one');
if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('This is for real Firestore; unset FIRESTORE_EMULATOR_HOST');

const rate = Number(values.rate);
const seconds = Number(values.seconds);
const walkInShare = Number(values['walk-ins']);
const total = Math.round(rate * seconds);

const db = getFirestore(initializeApp({ projectId: project }), database);
const slug = `load-${Date.now()}`;
const ref = db.doc(`events/${slug}`);
const registered = Math.ceil(total * (1 - walkInShare));

// The event, and everyone who'll check in from the list
await ref.set({
	slug,
	name: 'Load test',
	description: '',
	status: 'open',
	startsAt: Timestamp.now(),
	endsAt: Timestamp.fromMillis(Date.now() + 3 * 60 * 60 * 1000),
	timeZone: 'Australia/Sydney',
	teamIds: [],
	counts: { registered, checkedIn: 0, walkIns: 0 },
	walkInCounter: 0,
	walkInTicketPrefix: 'LOADWALKIN',
	selfWalkIns: true,
});
for (let start = 0; start < registered; start += 500) {
	const batch = db.batch();
	for (let i = start; i < Math.min(start + 500, registered); i++) {
		const ticket = `LOAD${String(i).padStart(6, '0')}`;
		batch.set(ref.collection('attendees').doc(ticket), { firstName: 'Load', lastName: `${i}`, email: `person${i}@example.com`, source: 'bevy', checkedInAt: null });
	}
	await batch.commit();
}
console.log(`${total} attempts over ${seconds}s (${rate}/s), ${Math.round(walkInShare * 100)}% walk-ins, against ${project}/${database}…`);

const VENUE_IP = '203.0.113.7';
const results: { ms: number; outcome: string }[] = [];

async function attempt(i: number) {
	const startedAt = performance.now();
	let outcome = 'ok';
	try {
		if (!(await allowAttempt(db, VENUE_IP, slug))) outcome = 'rate-limited';
		else if (i < registered) await checkIn(db, slug, { email: `person${i}@example.com` });
		else await walkIn(db, slug, { email: `walkin${i}@example.com`, firstName: 'Walk', lastName: `In ${i}` });
	} catch (error) {
		outcome = error instanceof ApiFailure ? error.code : `error: ${(error as Error).message.split('\n')[0]}`;
	}
	results.push({ ms: performance.now() - startedAt, outcome });
}

// Shuffle so check-ins and walk-ins arrive mixed, then start one every 1/rate seconds
const order = [...Array(total).keys()].sort(() => Math.random() - 0.5);
const running: Promise<void>[] = [];
const began = performance.now();
for (const [n, i] of order.entries()) {
	const due = began + (n * 1000) / rate;
	await new Promise((resolve) => setTimeout(resolve, Math.max(0, due - performance.now())));
	running.push(attempt(i));
}
await Promise.all(running);

const ms = results.map((r) => r.ms).sort((a, b) => a - b);
const pct = (p: number) => Math.round(ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))]);
const outcomes = Object.entries(Object.groupBy(results, (r) => r.outcome)).map(([k, v]) => `${k} ${v!.length}`);
const event = (await ref.get()).data()!;
const succeeded = results.filter((r) => r.outcome === 'ok').length;
const walkInsOk = order.filter((i) => i >= registered).length;

console.log(`Outcomes: ${outcomes.join(', ')}`);
console.log(`Latency: p50 ${pct(50)}ms, p95 ${pct(95)}ms, p99 ${pct(99)}ms, max ${pct(100)}ms`);
const checkedIn = (await ref.collection('attendees').where('checkedInAt', '!=', null).count().get()).data().count;
console.log(`Checked in: ${checkedIn} (expected ${succeeded}), walkInCounter ${event.walkInCounter} (expected ${walkInsOk} if all succeeded)`);
