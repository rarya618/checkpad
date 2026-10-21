// Tests for the Firestore triggers (src/triggers.ts), which run in the Functions emulator as
// the tests write. Run with the API tests (see api.test.ts for the command).
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { beforeEach, describe, test } from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { clearFirestore } from '../scripts/emulator.ts';

const PROJECT = 'demo-checkpad';
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run inside `firebase emulators:exec` so FIRESTORE_EMULATOR_HOST is set');

const db = getFirestore(initializeApp({ projectId: PROJECT }, 'triggers'));
// A new event in every test, so triggers from the last test's writes (and from wiping them)
// can't land in this one
let id = '';
let event = db.doc('events/unset');
const person = (email: string, fields: Record<string, unknown> = {}) => ({ firstName: 'A', lastName: 'B', email, source: 'bevy', checkedInAt: null, ...fields });

/** Waits for a trigger to catch up: until `check` stops throwing, or 10 seconds. */
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

beforeEach(async () => {
	await clearFirestore(PROJECT);
	id = `t-${Date.now()}`;
	event = db.doc(`events/${id}`);
	await event.set({ slug: 'trigger-test', name: 'Trigger test', counts: { registered: 0, checkedIn: 0, walkIns: 0 } });
	await db.doc('slugs/trigger-test').set({ eventId: id });
	await db.doc('slugs/trigger-test-old').set({ eventId: id });
	await db.doc('slugs/someone-else').set({ eventId: 'other' });
});

describe('countAttendees', () => {
	test('counts registered, checked in and walk-ins from the attendees, whoever wrote them', async () => {
		const batch = db.batch();
		batch.set(event.collection('attendees').doc('GOOGA001'), person('a@example.com'));
		batch.set(event.collection('attendees').doc('GOOGA002'), person('b@example.com', { checkedInAt: Timestamp.now() }));
		batch.set(event.collection('attendees').doc('GDGWALKIN0001'), person('c@example.com', { source: 'walk-in', checkedInAt: Timestamp.now() }));
		await batch.commit();
		await eventually(async () => assert.deepEqual((await event.get()).get('counts'), { registered: 3, checkedIn: 2, walkIns: 1 }));

		// Undo, and check someone in twice (from two devices): counted once
		await event.collection('attendees').doc('GOOGA002').update({ checkedInAt: null });
		await Promise.all([
			event.collection('attendees').doc('GOOGA001').update({ checkedInAt: Timestamp.now() }),
			event.collection('attendees').doc('GOOGA001').update({ checkedInAt: Timestamp.now() }),
		]);
		await eventually(async () => assert.deepEqual((await event.get()).get('counts'), { registered: 3, checkedIn: 2, walkIns: 1 }));

		await event.collection('attendees').doc('GDGWALKIN0001').delete();
		await eventually(async () => assert.deepEqual((await event.get()).get('counts'), { registered: 2, checkedIn: 1, walkIns: 0 }));
	});

	test('a rush of check-ins is counted exactly', async () => {
		const batch = db.batch();
		for (let i = 0; i < 40; i++) batch.set(event.collection('attendees').doc(`GOOGA${i}`), person(`p${i}@example.com`));
		await batch.commit();
		await eventually(async () => assert.equal((await event.get()).get('counts.registered'), 40));
		await Promise.all(Array.from({ length: 40 }, (_, i) => event.collection('attendees').doc(`GOOGA${i}`).update({ checkedInAt: Timestamp.now() })));
		await eventually(async () => assert.deepEqual((await event.get()).get('counts'), { registered: 40, checkedIn: 40, walkIns: 0 }));
	});
});

describe('cleanUpDeletedEvent', () => {
	test('deletes the event’s attendees, prize draw and links, and nothing else', async () => {
		await event.collection('attendees').doc('GOOGA001').set(person('a@example.com'));
		await event.collection('draw').doc('GOOGA001').set({ result: 'won' });
		await event.delete();
		await eventually(async () => {
			assert.equal((await event.collection('attendees').get()).size, 0);
			assert.equal((await event.collection('draw').get()).size, 0);
			assert.deepEqual((await db.collection('slugs').get()).docs.map((d) => d.id), ['someone-else']);
		});
	});
});
