// End-to-end tests for the check-in API against the Firestore and Functions emulators.
// Run from the repo root (needs Java 21 on PATH for the Firestore emulator):
//   npx -y firebase-tools@latest emulators:exec --project demo-checkpad --only auth,firestore,functions "npm test -w @checkpad/functions"
// demo-checkpad is a demo project: the emulators never connect it to production.
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { clearFirestore } from '../scripts/emulator.ts';

const PROJECT = 'demo-checkpad';
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST;
assert.ok(FIRESTORE, 'Run inside `firebase emulators:exec` so FIRESTORE_EMULATOR_HOST is set');
const API = `http://127.0.0.1:5001/${PROJECT}/australia-southeast1/api`;

const db = getFirestore(initializeApp({ projectId: PROJECT }));
const hour = 60 * 60 * 1000;
const at = (ms: number) => Timestamp.fromMillis(Date.now() + ms);

function event(slug: string, fields: Record<string, unknown> = {}) {
	return {
		slug,
		name: `Event ${slug}`,
		description: 'Join us for our monthly meetup',
		status: 'open',
		startsAt: at(-hour),
		endsAt: at(2 * hour),
		timeZone: 'Australia/Sydney',
		teamIds: ['team-test'],
		// The countAttendees trigger counts the attendees written below
		counts: { registered: 0, checkedIn: 0, walkIns: 0 },
		walkInCounter: 0,
		walkInTicketPrefix: 'TESTWALKIN',
		selfWalkIns: true,
		...fields,
	};
}

// A new ID for the main event in every test, so triggers from the last test's writes (and
// from wiping them) can't land in this one's counts
let e1 = '';

beforeEach(async () => {
	await clearFirestore(PROJECT);
	e1 = `e1-${Date.now()}`;
	const batch = db.batch();
	const meetup = db.doc(`events/${e1}`);
	batch.set(meetup, event('test-meetup'));
	batch.set(meetup.collection('attendees').doc('GOOGA001'), { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', source: 'bevy', checkedInAt: null });
	batch.set(meetup.collection('attendees').doc('GOOGA002'), { firstName: 'Sam', lastName: 'Lee', email: 'sam@example.com', source: 'bevy', checkedInAt: at(-10 * 60 * 1000) });
	batch.set(db.doc('events/e2'), event('closed-meetup', { status: 'closed', startsAt: at(24 * hour), endsAt: at(27 * hour) }));
	batch.set(db.doc('events/e3'), event('no-walk-ins', { selfWalkIns: false, teamIds: [] }));
	batch.set(db.doc('teams/team-test'), { name: 'GDG Test', slug: 'gdg-test' });
	batch.set(db.doc('teams/team-empty'), { name: 'GDG Empty', slug: 'gdg-empty' });
	await batch.commit();
});

async function call(path: string, body?: object) {
	const res = await fetch(`${API}${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
	return { status: res.status, body: await res.json(), cache: res.headers.get('cache-control') };
}

const counts = async (id = e1) => (await db.doc(`events/${id}`).get()).get('counts');

/** Waits for the countAttendees trigger to catch up: until `check` stops throwing, or 10 seconds. */
async function eventually(check: () => Promise<void>) {
	for (let tries = 0; ; tries++) {
		try {
			return await check();
		} catch (error) {
			if (tries > 50) throw error;
			await sleep(200);
		}
	}
}

/** Counts once the trigger has caught up with every attendee write so far. */
async function settledCounts(id = e1) {
	let settled: Record<string, number> = {};
	await eventually(async () => {
		const attendees = (await db.collection(`events/${id}/attendees`).get()).docs.map((d) => d.data());
		settled = await counts(id);
		assert.deepEqual(settled, {
			registered: attendees.length,
			checkedIn: attendees.filter((a) => a.checkedInAt).length,
			walkIns: attendees.filter((a) => a.source === 'walk-in').length,
		});
	});
	return settled;
}

// Each test starts once the seeded attendees are counted, and ends once its own writes are
beforeEach(() => settledCounts());
afterEach(() => settledCounts());

describe('GET /events/:slug', () => {
	test('returns only the public details', async () => {
		const { status, body, cache } = await call('/events/test-meetup');
		assert.equal(status, 200);
		assert.deepEqual(Object.keys(body).sort(), ['description', 'endsAt', 'name', 'open', 'selfWalkIns', 'slug', 'startsAt', 'timeZone']);
		assert.equal(body.open, true);
		assert.match(cache ?? '', /s-maxage=15/);
	});

	test('works with the /api prefix the Hosting rewrite adds', async () => {
		assert.equal((await call('/api/events/test-meetup')).status, 200);
	});

	test('404s for an unknown link', async () => {
		assert.deepEqual(await call('/events/nope').then((r) => [r.status, r.body]), [404, { error: 'not-found' }]);
	});
});

describe('POST /events/:slug/check-in', () => {
	test('checks in by email, ignoring case and spaces, and returns no personal details beyond the first name', async () => {
		const { status, body } = await call('/events/test-meetup/check-in', { email: '  Jane@Example.COM ' });
		assert.equal(status, 200);
		assert.equal(body.status, 'checked-in');
		assert.equal(body.firstName, 'Jane');
		assert.equal(body.ticket, 'GOOGA001');
		assert.equal(body.alreadyCheckedIn, false);
		assert.deepEqual(Object.keys(body).sort(), ['alreadyCheckedIn', 'checkedInAt', 'firstName', 'status', 'ticket']);
		assert.equal((await settledCounts()).checkedIn, 2);
	});

	test('a second check-in reports the first one and counts once', async () => {
		const first = (await call('/events/test-meetup/check-in', { email: 'jane@example.com' })).body;
		const second = (await call('/events/test-meetup/check-in', { email: 'jane@example.com' })).body;
		assert.equal(second.alreadyCheckedIn, true);
		assert.equal(second.checkedInAt, first.checkedInAt);
		assert.equal((await settledCounts()).checkedIn, 2);
	});

	test('someone not on the list is told so, with whether they can add themselves', async () => {
		assert.deepEqual((await call('/events/test-meetup/check-in', { email: 'new@example.com' })).body, { status: 'not-registered', selfWalkIns: true });
	});

	test('refuses while self check-in is closed', async () => {
		assert.deepEqual(await call('/events/closed-meetup/check-in', { email: 'jane@example.com' }).then((r) => [r.status, r.body]), [409, { error: 'closed' }]);
	});

	test('rejects a malformed email', async () => {
		assert.deepEqual(await call('/events/test-meetup/check-in', { email: 'not-an-email' }).then((r) => [r.status, r.body]), [400, { error: 'invalid' }]);
	});

	test('only accepts POST', async () => {
		assert.equal((await call('/events/test-meetup/check-in')).status, 405);
	});

	test('slows down a flood of attempts from one network', async () => {
		// CHECKIN_RATE_LIMIT is 10 in functions/.env.demo-checkpad
		const statuses = [];
		for (let i = 0; i < 11; i++) statuses.push((await call('/events/test-meetup/check-in', { email: `guess${i}@example.com` })).status);
		assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
		assert.equal(statuses[10], 429);
	});
});

describe('POST /events/:slug/walk-in', () => {
	const person = { email: 'new@example.com', firstName: 'Ada', lastName: 'Lovelace' };

	test('adds a walk-in with the next ticket, already checked in', async () => {
		const { status, body } = await call('/events/test-meetup/walk-in', person);
		assert.equal(status, 200);
		assert.equal(body.ticket, 'TESTWALKIN0001');
		assert.equal(body.firstName, 'Ada');
		const saved = (await db.doc(`events/${e1}/attendees/TESTWALKIN0001`).get()).data()!;
		assert.equal(saved.source, 'walk-in');
		assert.equal(saved.email, 'new@example.com');
		assert.ok(saved.checkedInAt);
		assert.deepEqual(await settledCounts(), { registered: 3, checkedIn: 2, walkIns: 1 });
	});

	test('walk-ins added at the same moment never share a ticket', async () => {
		const results = await Promise.all(
			Array.from({ length: 5 }, (_, i) => call('/events/test-meetup/walk-in', { ...person, email: `walkin${i}@example.com` })),
		);
		const tickets = results.map((r) => r.body.ticket).sort();
		assert.deepEqual(tickets, ['TESTWALKIN0001', 'TESTWALKIN0002', 'TESTWALKIN0003', 'TESTWALKIN0004', 'TESTWALKIN0005']);
		assert.equal((await db.doc(`events/${e1}`).get()).get('walkInCounter'), 5);
	});

	test('someone already on the list is checked in under their own ticket', async () => {
		const { body } = await call('/events/test-meetup/walk-in', { ...person, email: 'jane@example.com' });
		assert.equal(body.ticket, 'GOOGA001');
		assert.equal((await db.doc(`events/${e1}`).get()).get('walkInCounter'), 0);
	});

	test('refuses when the event has self-serve walk-ins off', async () => {
		assert.deepEqual(await call('/events/no-walk-ins/walk-in', person).then((r) => [r.status, r.body]), [403, { error: 'walk-ins-off' }]);
	});

	test('refuses while self check-in is closed', async () => {
		assert.equal((await call('/events/closed-meetup/walk-in', person)).status, 409);
	});

	test('needs a first and last name', async () => {
		assert.equal((await call('/events/test-meetup/walk-in', { ...person, lastName: '  ' })).status, 400);
	});
});

describe('GET /teams/:slug', () => {
	test('points at the team’s open event', async () => {
		assert.deepEqual((await call('/teams/gdg-test')).body, { team: { slug: 'gdg-test', name: 'GDG Test' }, eventSlug: 'test-meetup' });
	});

	test('falls back to the next event when none is open', async () => {
		await db.doc(`events/${e1}`).update({ status: 'closed', endsAt: at(-hour) });
		assert.equal((await call('/teams/gdg-test')).body.eventSlug, 'closed-meetup');
	});

	test('has no event when the team has nothing open or coming up', async () => {
		assert.equal((await call('/teams/gdg-empty')).body.eventSlug, null);
	});

	test('404s for an unknown team', async () => {
		assert.equal((await call('/teams/nope')).status, 404);
	});
});

describe('POST /auth/sign-in-link', () => {
	const DASHBOARD = 'http://localhost:5173';

	async function askForLink(body: object, origin = DASHBOARD) {
		const res = await fetch(`${API}/auth/sign-in-link`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin },
			body: JSON.stringify(body),
		});
		return { status: res.status, body: await res.json() };
	}

	// The emulators record emails in emulatorOutbox instead of sending them (email.ts)
	const sentTo = async (email: string) => (await db.collection('emulatorOutbox').where('to', '==', email).get()).docs.map((d) => d.data());

	beforeEach(async () => {
		await db.doc('admins/priya@example.com').set({ role: 'organiser', teamId: 'team-test', invitedAt: at(0) });
	});

	test('emails an organiser a link back to the page they asked from', async () => {
		assert.deepEqual(await askForLink({ email: ' Priya@Example.com ', next: '/events/test-meetup' }), { status: 200, body: { status: 'sent' } });
		const [email] = await sentTo('priya@example.com');
		assert.equal(email.template, 'sign-in');
		assert.equal(email.variables.ADDRESS, 'priya@example.com');
		const link = new URL(email.variables.LINK);
		assert.equal(link.searchParams.get('mode'), 'signIn');
		assert.ok(link.searchParams.get('oobCode'));
		const back = new URL(link.searchParams.get('continueUrl')!);
		assert.equal(back.origin + back.pathname, `${DASHBOARD}/sign-in/link`);
		assert.equal(back.searchParams.get('next'), '/events/test-meetup');
	});

	test('answers the same for someone not on the list, but sends nothing', async () => {
		assert.deepEqual(await askForLink({ email: 'stranger@example.com' }), { status: 200, body: { status: 'sent' } });
		assert.deepEqual(await sentTo('stranger@example.com'), []);
	});

	test('only links back to the dashboard', async () => {
		assert.deepEqual(await askForLink({ email: 'priya@example.com' }, 'https://evil.example'), { status: 400, body: { error: 'invalid' } });
		assert.deepEqual(await sentTo('priya@example.com'), []);
	});

	test('never returns somewhere off the dashboard', async () => {
		await askForLink({ email: 'priya@example.com', next: '//evil.example' });
		const [email] = await sentTo('priya@example.com');
		const back = new URL(new URL(email.variables.LINK).searchParams.get('continueUrl')!);
		assert.equal(back.searchParams.get('next'), '/events');
	});

	test('needs an email address', async () => {
		assert.deepEqual(await askForLink({ email: 'not an email' }), { status: 400, body: { error: 'invalid' } });
	});

	test('limits links to one address', async () => {
		for (let i = 0; i < 5; i++) assert.equal((await askForLink({ email: 'priya@example.com' })).status, 200);
		assert.deepEqual(await askForLink({ email: 'priya@example.com' }), { status: 429, body: { error: 'rate-limited' } });
	});
});

describe('DELETE /admin/teams/:teamId', () => {
	const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST;

	/** An ID token for `email`, from the Auth emulator, as the dashboard sends it. */
	async function tokenFor(email: string, emailVerified = true) {
		await getAuth().createUser({ email, emailVerified, password: 'password' });
		const res = await fetch(`http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password: 'password', returnSecureToken: true }),
		});
		return ((await res.json()) as { idToken: string }).idToken;
	}

	async function deleteTeam(teamId: string, token?: string) {
		const res = await fetch(`${API}/admin/teams/${teamId}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {} });
		return { status: res.status, body: await res.json() };
	}

	const teamExists = async (teamId: string) => (await db.doc(`teams/${teamId}`).get()).exists;

	beforeEach(async () => {
		assert.ok(AUTH, 'Run with the Auth emulator so FIREBASE_AUTH_EMULATOR_HOST is set');
		await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
		await db.doc('admins/boss@example.com').set({ role: 'super-admin', teamId: null, invitedAt: at(0) });
		await db.doc('admins/priya@example.com').set({ role: 'organiser', teamId: 'team-test', invitedAt: at(0) });
	});

	test('a super admin deletes a team nothing uses', async () => {
		assert.deepEqual(await deleteTeam('team-empty', await tokenFor('boss@example.com')), { status: 200, body: { status: 'deleted' } });
		assert.equal(await teamExists('team-empty'), false);
	});

	test('keeps a team that an event uses', async () => {
		await db.doc('admins/priya@example.com').delete();
		assert.deepEqual(await deleteTeam('team-test', await tokenFor('boss@example.com')), { status: 409, body: { error: 'in-use' } });
		assert.equal(await teamExists('team-test'), true);
	});

	test('keeps a team that an organiser is on', async () => {
		await db.doc('admins/tom@example.com').set({ role: 'team-member', teamId: 'team-empty', invitedAt: at(0) });
		assert.deepEqual(await deleteTeam('team-empty', await tokenFor('boss@example.com')), { status: 409, body: { error: 'in-use' } });
		assert.equal(await teamExists('team-empty'), true);
	});

	test('says when the team is already gone', async () => {
		assert.deepEqual(await deleteTeam('nope', await tokenFor('boss@example.com')), { status: 404, body: { error: 'not-found' } });
	});

	test('only for super admins', async () => {
		assert.deepEqual(await deleteTeam('team-empty'), { status: 401, body: { error: 'forbidden' } });
		assert.deepEqual(await deleteTeam('team-empty', 'not-a-token'), { status: 401, body: { error: 'forbidden' } });
		assert.deepEqual(await deleteTeam('team-empty', await tokenFor('priya@example.com')), { status: 403, body: { error: 'forbidden' } });
		assert.deepEqual(await deleteTeam('team-empty', await tokenFor('stranger@example.com')), { status: 403, body: { error: 'forbidden' } });
		await db.doc('admins/unverified@example.com').set({ role: 'super-admin', teamId: null, invitedAt: at(0) });
		assert.deepEqual(await deleteTeam('team-empty', await tokenFor('unverified@example.com', false)), { status: 401, body: { error: 'forbidden' } });
		assert.equal(await teamExists('team-empty'), true);
	});
});
