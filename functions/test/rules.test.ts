// Tests for the Firestore security rules (firestore.rules) against the Firestore emulator:
// what each kind of organiser, and everyone else, can do from a browser. Runs with the API
// tests (see api.test.ts for the command). The check-in API and the triggers use the Admin
// SDK, which skips these rules.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
	addDoc,
	collection,
	collectionGroup,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	query,
	runTransaction,
	serverTimestamp,
	setDoc,
	Timestamp,
	updateDoc,
	where,
	writeBatch,
	type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

before(async () => {
	env = await initializeTestEnvironment({
		projectId: 'demo-checkpad',
		firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
	});
});

after(() => env.cleanup());

const hour = 60 * 60 * 1000;

function event(slug: string, teamIds: string[], fields: Record<string, unknown> = {}) {
	return {
		slug,
		name: `Event ${slug}`,
		description: 'Join us for our monthly meetup',
		status: 'closed',
		startsAt: Timestamp.fromMillis(Date.now() + hour),
		endsAt: Timestamp.fromMillis(Date.now() + 4 * hour),
		timeZone: 'Australia/Sydney',
		teamIds,
		counts: { registered: 0, checkedIn: 0, walkIns: 0 },
		walkInCounter: 0,
		walkInTicketPrefix: 'GDGWALKIN',
		selfWalkIns: true,
		walkInTicketTitle: 'General admission',
		walkInVenue: '',
		...fields,
	};
}

const admin = (role: string, teamId: string | null) => ({ role, teamId, invitedAt: Timestamp.now(), invitedBy: 'boss@example.com' });

// Two teams with an event each, organisers of every kind, and what the check-in API and
// the old app's data look like, written past the rules
beforeEach(async () => {
	await env.clearFirestore();
	await env.withSecurityRulesDisabled(async (context) => {
		const db = context.firestore();
		await setDoc(doc(db, 'teams/sydney'), { name: 'GDG Sydney', slug: 'gdg-sydney', walkInTicketPrefix: 'GDGWALKIN' });
		await setDoc(doc(db, 'teams/melbourne'), { name: 'GDG Melbourne', slug: 'gdg-melbourne', walkInTicketPrefix: 'MELWALKIN' });
		await setDoc(doc(db, 'admins/boss@example.com'), admin('super-admin', null));
		await setDoc(doc(db, 'admins/priya@example.com'), admin('organiser', 'sydney'));
		await setDoc(doc(db, 'admins/tom@example.com'), admin('team-member', 'sydney'));
		await setDoc(doc(db, 'admins/mel@example.com'), admin('organiser', 'melbourne'));
		await setDoc(doc(db, 'events/syd'), event('sydney-meetup', ['sydney'], { counts: { registered: 2, checkedIn: 1, walkIns: 0 } }));
		await setDoc(doc(db, 'slugs/sydney-meetup'), { eventId: 'syd' });
		await setDoc(doc(db, 'events/syd/attendees/GOOGA001'), { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', source: 'bevy', checkedInAt: null });
		await setDoc(doc(db, 'events/syd/attendees/GOOGA002'), {
			firstName: 'Sam',
			lastName: 'Lee',
			email: 'sam@example.com',
			source: 'bevy',
			checkedInAt: Timestamp.now(),
		});
		await setDoc(doc(db, 'events/syd/draw/GOOGA002'), { result: 'won', drawnAt: Timestamp.now(), winnerNumber: 1 });
		await setDoc(doc(db, 'events/mel'), event('melbourne-meetup', ['melbourne']));
		await setDoc(doc(db, 'slugs/melbourne-meetup'), { eventId: 'mel' });
		await setDoc(doc(db, 'events/mel/attendees/GOOGA101'), { firstName: 'Ana', lastName: 'Ruiz', email: 'ana@example.com', source: 'bevy', checkedInAt: null });
		await setDoc(doc(db, 'rateLimits/abc'), { count: 1 });
		await setDoc(doc(db, 'waitlist/w1'), { email: 'someone@example.com', createdAt: Timestamp.now() });
	});
});

const visitor = () => env.unauthenticatedContext().firestore();
const as = (email: string, verified = true) => env.authenticatedContext(email, { email, email_verified: verified }).firestore();
const boss = () => as('boss@example.com');
const priya = () => as('priya@example.com');
const tom = () => as('tom@example.com');
const mel = () => as('mel@example.com');

const LOCKED = ['events/syd', 'events/syd/attendees/GOOGA001', 'events/syd/draw/GOOGA002', 'admins/priya@example.com', 'teams/sydney', 'slugs/sydney-meetup', 'rateLimits/abc'];

const outsiders: [string, () => Firestore][] = [
	['a visitor', visitor],
	['someone signed in who isn’t an organiser', () => as('stranger@example.com')],
	['an organiser whose email isn’t verified', () => as('priya@example.com', false)],
];

for (const [who, db] of outsiders) {
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

		test('can’t make themselves an organiser', async () => {
			await assertFails(setDoc(doc(db(), 'admins/stranger@example.com'), admin('super-admin', null)));
		});
	});
}

describe('reading', () => {
	test('a super admin sees every event, attendee, organiser and team', async () => {
		await assertSucceeds(getDocs(collection(boss(), 'events')));
		await assertSucceeds(getDocs(collection(boss(), 'events/mel/attendees')));
		await assertSucceeds(getDocs(collection(boss(), 'admins')));
		await assertSucceeds(getDocs(collection(boss(), 'teams')));
	});

	test('the rest of the team sees only its own events, attendees and prize draw', async () => {
		for (const db of [priya, tom]) {
			await assertSucceeds(getDocs(query(collection(db(), 'events'), where('teamIds', 'array-contains', 'sydney'))));
			await assertSucceeds(getDocs(collection(db(), 'events/syd/attendees')));
			await assertSucceeds(getDocs(collection(db(), 'events/syd/draw')));
			await assertFails(getDocs(collection(db(), 'events')));
			await assertFails(getDoc(doc(db(), 'events/mel')));
			await assertFails(getDocs(collection(db(), 'events/mel/attendees')));
		}
	});

	test('nobody but super admins searches attendees across events', async () => {
		await assertFails(getDocs(collectionGroup(priya(), 'attendees')));
	});

	test('organisers see themselves and their team, not other teams’ people', async () => {
		await assertSucceeds(getDoc(doc(tom(), 'admins/tom@example.com')));
		await assertSucceeds(getDocs(query(collection(tom(), 'admins'), where('teamId', '==', 'sydney'))));
		await assertFails(getDoc(doc(tom(), 'admins/mel@example.com')));
		await assertFails(getDocs(collection(tom(), 'admins')));
	});

	test('every organiser sees team names and event links, for menus and unique links', async () => {
		await assertSucceeds(getDocs(collection(mel(), 'teams')));
		await assertSucceeds(getDocs(collection(mel(), 'slugs')));
	});
});

/** A new event and its link in one batch, as the dashboard saves them. */
function createEvent(db: Firestore, id: string, data: Record<string, unknown>) {
	const batch = writeBatch(db);
	batch.set(doc(db, `events/${id}`), data);
	batch.set(doc(db, `slugs/${data.slug}`), { eventId: id });
	return batch.commit();
}

describe('creating events', () => {
	test('organisers create their own team’s events; team members don’t', async () => {
		await assertSucceeds(createEvent(priya(), 'new', event('october-meetup', ['sydney'])));
		await assertFails(createEvent(tom(), 'new2', event('november-meetup', ['sydney'])));
	});

	test('organisers can’t create events for another team, or with no team', async () => {
		await assertFails(createEvent(priya(), 'new', event('october-meetup', ['melbourne'])));
		await assertFails(createEvent(priya(), 'new', event('october-meetup', [])));
		await assertSucceeds(createEvent(boss(), 'new', event('october-meetup', [])));
	});

	test('the link must be free, and claimed in the same write', async () => {
		await assertFails(createEvent(priya(), 'new', event('sydney-meetup', ['sydney'])));
		await assertFails(createEvent(mel(), 'new', event('melbourne-meetup', ['melbourne'])));
		await assertFails(setDoc(doc(priya(), 'events/new'), event('october-meetup', ['sydney'])));
	});

	test('the link can’t be one of the attendee site’s pages, or have capitals or spaces', async () => {
		for (const slug of ['api', 'check-in', 'team', 'October', 'october meetup', '-october', 'october--meetup']) {
			await assertFails(createEvent(priya(), 'new', event(slug, ['sydney'])));
		}
	});

	test('a new event starts with no counts and no walk-ins', async () => {
		await assertFails(createEvent(priya(), 'new', event('october-meetup', ['sydney'], { counts: { registered: 100, checkedIn: 0, walkIns: 0 } })));
		await assertFails(createEvent(priya(), 'new', event('october-meetup', ['sydney'], { walkInCounter: 5 })));
	});

	test('refuses an end before the start, an unknown status or extra fields', async () => {
		await assertFails(createEvent(priya(), 'new', event('october-meetup', ['sydney'], { endsAt: Timestamp.fromMillis(Date.now()) })));
		await assertFails(createEvent(priya(), 'new', event('october-meetup', ['sydney'], { status: 'maybe' })));
		await assertFails(createEvent(priya(), 'new', event('october-meetup', ['sydney'], { admin: true })));
	});

	test('nobody can claim a link for someone else’s event', async () => {
		await assertFails(setDoc(doc(priya(), 'slugs/stolen'), { eventId: 'mel' }));
		await assertFails(setDoc(doc(priya(), 'slugs/sydney-meetup'), { eventId: 'syd' }));
	});
});

describe('changing events', () => {
	test('organisers edit their team’s events; team members and other teams don’t', async () => {
		await assertSucceeds(updateDoc(doc(priya(), 'events/syd'), { name: 'Renamed', status: 'open' }));
		await assertFails(updateDoc(doc(tom(), 'events/syd'), { status: 'open' }));
		await assertFails(updateDoc(doc(mel(), 'events/syd'), { status: 'open' }));
	});

	test('a new link is claimed in the same write, and the old one keeps pointing at the event', async () => {
		const db = priya();
		const batch = writeBatch(db);
		batch.update(doc(db, 'events/syd'), { slug: 'sydney-october' });
		batch.set(doc(db, 'slugs/sydney-october'), { eventId: 'syd' });
		await assertSucceeds(batch.commit());
		await assertFails(updateDoc(doc(priya(), 'events/syd'), { slug: 'unclaimed' }));
		// Back to the old link, which is still the event's
		await assertSucceeds(updateDoc(doc(priya(), 'events/syd'), { slug: 'sydney-meetup' }));
	});

	test('nobody changes the counts: a function keeps them', async () => {
		await assertFails(updateDoc(doc(boss(), 'events/syd'), { 'counts.checkedIn': 50 }));
	});

	test('organisers can’t move an event to a team they don’t run', async () => {
		await assertFails(updateDoc(doc(priya(), 'events/syd'), { teamIds: ['melbourne'] }));
		await assertSucceeds(updateDoc(doc(boss(), 'events/syd'), { teamIds: ['melbourne'] }));
	});

	test('organisers delete their team’s events; team members don’t', async () => {
		await assertFails(deleteDoc(doc(tom(), 'events/syd')));
		await assertFails(deleteDoc(doc(mel(), 'events/syd')));
		await assertSucceeds(deleteDoc(doc(priya(), 'events/syd')));
	});
});

describe('checking people in', () => {
	const checkIn = (db: Firestore, email: string) =>
		updateDoc(doc(db, 'events/syd/attendees/GOOGA001'), { checkedInAt: serverTimestamp(), checkedInBy: email });

	test('anyone on the team checks people in and undoes it, as themselves', async () => {
		await assertSucceeds(checkIn(tom(), 'tom@example.com'));
		await assertSucceeds(updateDoc(doc(tom(), 'events/syd/attendees/GOOGA001'), { checkedInAt: null, checkedInBy: null }));
		await assertSucceeds(checkIn(priya(), 'priya@example.com'));
	});

	test('can’t check in as someone else, at a made-up time, or at another team’s event', async () => {
		await assertFails(checkIn(tom(), 'priya@example.com'));
		await assertFails(updateDoc(doc(tom(), 'events/syd/attendees/GOOGA001'), { checkedInAt: Timestamp.fromMillis(0), checkedInBy: 'tom@example.com' }));
		await assertFails(updateDoc(doc(mel(), 'events/syd/attendees/GOOGA001'), { checkedInAt: serverTimestamp(), checkedInBy: 'mel@example.com' }));
	});

	test('team members can’t change who someone is', async () => {
		await assertFails(updateDoc(doc(tom(), 'events/syd/attendees/GOOGA001'), { email: 'other@example.com' }));
		await assertFails(updateDoc(doc(tom(), 'events/syd/attendees/GOOGA001'), { firstName: 'Janet' }));
	});
});

describe('walk-ins', () => {
	/** The dashboard's walk-in: takes the next number and adds the person, in one transaction. */
	const addWalkIn = (db: Firestore, ticket: string, by: string, bump = 1) =>
		runTransaction(db, async (tx) => {
			const snap = await tx.get(doc(db, 'events/syd'));
			tx.update(doc(db, 'events/syd'), { walkInCounter: snap.get('walkInCounter') + bump });
			tx.set(doc(db, `events/syd/attendees/${ticket}`), {
				firstName: 'Walk',
				lastName: 'In',
				email: 'walk@example.com',
				source: 'walk-in',
				checkedInAt: serverTimestamp(),
				checkedInBy: by,
			});
		});

	test('anyone on the team adds one with the next number', async () => {
		await assertSucceeds(addWalkIn(tom(), 'GDGWALKIN0001', 'tom@example.com'));
	});

	test('must take the number in the same write, and use the event’s prefix', async () => {
		await assertFails(addWalkIn(tom(), 'GDGWALKIN0001', 'tom@example.com', 0));
		await assertFails(addWalkIn(tom(), 'GDGWALKIN0001', 'tom@example.com', 2));
		await assertFails(addWalkIn(tom(), 'MELWALKIN0001', 'tom@example.com'));
	});

	test('can’t take over an existing ticket', async () => {
		await assertFails(addWalkIn(tom(), 'GOOGA001', 'tom@example.com'));
	});

	test('staff can undo their own walk-ins only; organisers remove anyone', async () => {
		await assertSucceeds(addWalkIn(tom(), 'GDGWALKIN0001', 'tom@example.com'));
		await assertSucceeds(addWalkIn(priya(), 'GDGWALKIN0002', 'priya@example.com'));
		await assertSucceeds(deleteDoc(doc(tom(), 'events/syd/attendees/GDGWALKIN0001')));
		await assertFails(deleteDoc(doc(tom(), 'events/syd/attendees/GDGWALKIN0002')));
		await assertFails(deleteDoc(doc(tom(), 'events/syd/attendees/GOOGA001')));
		await assertSucceeds(deleteDoc(doc(priya(), 'events/syd/attendees/GOOGA001')));
	});
});

describe('Bevy imports', () => {
	const person = { firstName: 'New', lastName: 'Person', email: 'new@example.com', source: 'bevy', checkedInAt: null, ticketType: 'Student' };

	test('organisers add people who haven’t arrived, and update names and ticket types', async () => {
		await assertSucceeds(setDoc(doc(priya(), 'events/syd/attendees/GOOGA003'), person));
		await assertSucceeds(updateDoc(doc(priya(), 'events/syd/attendees/GOOGA001'), { firstName: 'Janet', ticketType: 'Student' }));
	});

	test('team members can’t import', async () => {
		await assertFails(setDoc(doc(tom(), 'events/syd/attendees/GOOGA003'), person));
	});

	test('imported people arrive unchecked, with a lowercase email', async () => {
		await assertFails(setDoc(doc(priya(), 'events/syd/attendees/GOOGA003'), { ...person, checkedInAt: Timestamp.now() }));
		await assertFails(setDoc(doc(priya(), 'events/syd/attendees/GOOGA003'), { ...person, email: 'New@Example.com' }));
		await assertFails(setDoc(doc(priya(), 'events/syd/attendees/GOOGA003'), { ...person, firstName: ' ' }));
	});

	test('an import can’t change someone’s check-in or email', async () => {
		await assertFails(updateDoc(doc(priya(), 'events/syd/attendees/GOOGA002'), { firstName: 'Samuel', checkedInAt: null }));
		await assertFails(updateDoc(doc(priya(), 'events/syd/attendees/GOOGA001'), { email: 'other@example.com' }));
	});
});

describe('prize draw', () => {
	const win = (db: Firestore) => setDoc(doc(db, 'events/syd/draw/GOOGA001'), { result: 'won', drawnAt: serverTimestamp(), winnerNumber: 2 });

	test('anyone on the team draws, marks someone not here and starts over', async () => {
		await assertSucceeds(win(tom()));
		await assertSucceeds(updateDoc(doc(tom(), 'events/syd/draw/GOOGA001'), { result: 'not-here' }));
		await assertSucceeds(deleteDoc(doc(tom(), 'events/syd/draw/GOOGA001')));
	});

	test('other teams can’t, and a not-here can’t become a win', async () => {
		await assertFails(win(mel()));
		await assertSucceeds(win(tom()));
		await assertSucceeds(updateDoc(doc(tom(), 'events/syd/draw/GOOGA001'), { result: 'not-here' }));
		await assertFails(updateDoc(doc(tom(), 'events/syd/draw/GOOGA001'), { result: 'won' }));
	});
});

describe('organisers and teams', () => {
	const invite = (db: Firestore, email: string, role: string, teamId: string | null, by = 'boss@example.com') =>
		setDoc(doc(db, `admins/${email}`), { role, teamId, invitedAt: serverTimestamp(), invitedBy: by });

	test('super admins add, change and remove organisers', async () => {
		await assertSucceeds(invite(boss(), 'sam@example.com', 'organiser', 'sydney'));
		await assertSucceeds(updateDoc(doc(boss(), 'admins/sam@example.com'), { role: 'team-member' }));
		await assertSucceeds(deleteDoc(doc(boss(), 'admins/sam@example.com')));
	});

	test('nobody else can, even for their own team', async () => {
		await assertFails(invite(priya(), 'sam@example.com', 'team-member', 'sydney', 'priya@example.com'));
		await assertFails(updateDoc(doc(priya(), 'admins/tom@example.com'), { role: 'organiser' }));
		await assertFails(deleteDoc(doc(priya(), 'admins/tom@example.com')));
	});

	test('nobody raises their own role or removes themselves', async () => {
		await assertFails(updateDoc(doc(tom(), 'admins/tom@example.com'), { role: 'super-admin' }));
		await assertFails(updateDoc(doc(boss(), 'admins/boss@example.com'), { role: 'organiser' }));
		await assertFails(deleteDoc(doc(boss(), 'admins/boss@example.com')));
	});

	test('an invite needs a lowercase email, a known role and team, and super admins have no team', async () => {
		await assertFails(invite(boss(), 'Sam@Example.com', 'organiser', 'sydney'));
		await assertFails(invite(boss(), 'sam@example.com', 'owner', 'sydney'));
		await assertFails(invite(boss(), 'sam@example.com', 'organiser', 'nowhere'));
		await assertFails(invite(boss(), 'sam@example.com', 'organiser', null));
		await assertFails(invite(boss(), 'sam@example.com', 'super-admin', 'sydney'));
		await assertSucceeds(invite(boss(), 'sam@example.com', 'super-admin', null));
	});

	test('signing in records your name and the time, on your own entry only', async () => {
		await assertSucceeds(updateDoc(doc(tom(), 'admins/tom@example.com'), { name: 'Tom Becker', lastSignInAt: serverTimestamp() }));
		await assertFails(updateDoc(doc(tom(), 'admins/tom@example.com'), { name: 'Tom Becker', lastSignInAt: Timestamp.fromMillis(0) }));
		await assertFails(updateDoc(doc(tom(), 'admins/priya@example.com'), { name: 'Not Priya', lastSignInAt: serverTimestamp() }));
	});

	test('super admins create and rename teams; nobody else does', async () => {
		const team = { name: 'GDG Perth', slug: 'gdg-perth', walkInTicketPrefix: 'PERWALKIN' };
		await assertFails(setDoc(doc(priya(), 'teams/perth'), team));
		await assertSucceeds(setDoc(doc(boss(), 'teams/perth'), team));
		await assertSucceeds(updateDoc(doc(boss(), 'teams/perth'), { name: 'GDG Perth City' }));
		await assertFails(setDoc(doc(boss(), 'teams/bad'), { ...team, walkInTicketPrefix: 'per walk' }));
	});

	test('nobody deletes a team from a browser, super admins included: the API does', async () => {
		await assertFails(deleteDoc(doc(boss(), 'teams/melbourne')));
	});
});

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

	test('only super admins read or delete entries', async () => {
		for (const db of [visitor, priya, tom]) {
			await assertFails(getDoc(doc(db(), 'waitlist/w1')));
			await assertFails(getDocs(collection(db(), 'waitlist')));
			await assertFails(deleteDoc(doc(db(), 'waitlist/w1')));
		}
		await assertSucceeds(getDocs(collection(boss(), 'waitlist')));
		await assertSucceeds(deleteDoc(doc(boss(), 'waitlist/w1')));
	});

	test('nobody changes an entry, super admins included', async () => {
		for (const db of [visitor, boss]) {
			await assertFails(updateDoc(doc(db(), 'waitlist/w1'), { email: 'other@example.com' }));
		}
	});
});
