// Tests for the Firestore security rules (firestore.rules) against the Firestore emulator:
// what a browser can and can't do, signed in or not. Runs with the API tests (see api.test.ts
// for the command). The check-in API uses the Admin SDK, which skips these rules, so here
// everything but adding to the waitlist must be refused.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

before(async () => {
	env = await initializeTestEnvironment({
		projectId: 'demo-checkpad',
		firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
	});
});

after(() => env.cleanup());

// What the check-in API and the old app's data look like, written past the rules
beforeEach(async () => {
	await env.clearFirestore();
	await env.withSecurityRulesDisabled(async (context) => {
		const db = context.firestore();
		await setDoc(doc(db, 'events/e1'), { slug: 'meetup', name: 'Meetup', status: 'open' });
		await setDoc(doc(db, 'events/e1/attendees/GOOGA001'), { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' });
		await setDoc(doc(db, 'events/e1/draw/GOOGA001'), { result: 'won' });
		await setDoc(doc(db, 'admins/organiser@example.com'), { role: 'organiser' });
		await setDoc(doc(db, 'teams/gdg-sydney'), { name: 'GDG Sydney', slug: 'gdg-sydney' });
		await setDoc(doc(db, 'rateLimits/abc'), { count: 1 });
		await setDoc(doc(db, 'waitlist/w1'), { email: 'someone@example.com', createdAt: Timestamp.now() });
	});
});

const visitor = () => env.unauthenticatedContext().firestore();
// Signing in alone mustn't unlock anything until roles exist (phase 2)
const signedIn = () => env.authenticatedContext('user-1', { email: 'organiser@example.com', email_verified: true }).firestore();

const LOCKED = ['events/e1', 'events/e1/attendees/GOOGA001', 'events/e1/draw/GOOGA001', 'admins/organiser@example.com', 'teams/gdg-sydney', 'rateLimits/abc'];

for (const [who, db] of [['a visitor', visitor], ['someone signed in', signedIn]] as const) {
	describe(`${who} can't touch anything but the waitlist`, () => {
		for (const path of LOCKED) {
			test(`can't read, create, change or delete ${path}`, async () => {
				await assertFails(getDoc(doc(db(), path)));
				await assertFails(setDoc(doc(db(), `${path}-new`), { x: 1 }));
				await assertFails(updateDoc(doc(db(), path), { x: 1 }));
				await assertFails(deleteDoc(doc(db(), path)));
			});
		}

		test('can’t list events or search attendees across events', async () => {
			await assertFails(getDocs(collection(db(), 'events')));
			await assertFails(getDocs(collectionGroup(db(), 'attendees')));
		});

		test('can’t read, change or delete waitlist entries', async () => {
			await assertFails(getDoc(doc(db(), 'waitlist/w1')));
			await assertFails(getDocs(collection(db(), 'waitlist')));
			await assertFails(updateDoc(doc(db(), 'waitlist/w1'), { email: 'other@example.com' }));
			await assertFails(deleteDoc(doc(db(), 'waitlist/w1')));
		});
	});
}

describe('joining the waitlist', () => {
	const join = (entry: Record<string, unknown>) => addDoc(collection(visitor(), 'waitlist'), entry);

	test('works with a lowercase email and the server’s time', async () => {
		await assertSucceeds(join({ email: 'new@example.com', createdAt: serverTimestamp() }));
	});

	test('refuses an email with capitals, which would dodge the dedupe', async () => {
		await assertFails(join({ email: 'New@Example.com', createdAt: serverTimestamp() }));
	});

	test('refuses something that isn’t an email', async () => {
		for (const email of ['', 'not-an-email', 'a@b', 'two words@example.com', 42]) {
			await assertFails(join({ email, createdAt: serverTimestamp() }));
		}
	});

	test('refuses an email over 254 characters', async () => {
		await assertFails(join({ email: `${'a'.repeat(243)}@example.com`, createdAt: serverTimestamp() }));
	});

	test('refuses a time set by the browser', async () => {
		await assertFails(join({ email: 'new@example.com', createdAt: Timestamp.fromMillis(Date.now() - 60_000) }));
	});

	test('refuses extra or missing fields', async () => {
		await assertFails(join({ email: 'new@example.com', createdAt: serverTimestamp(), admin: true }));
		await assertFails(join({ email: 'new@example.com' }));
		await assertFails(join({ createdAt: serverTimestamp() }));
	});

	test('can’t overwrite an existing entry by choosing its ID', async () => {
		await assertFails(setDoc(doc(visitor(), 'waitlist/w1'), { email: 'new@example.com', createdAt: serverTimestamp() }));
	});
});
