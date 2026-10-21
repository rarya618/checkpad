// Fills the Firestore emulator with the demo events (packages/shared mock-events), so the
// attendee site can be tried locally against the real check-in API. Wipes the emulator's
// data first. Run with the emulators going (see CLAUDE.md):
//   npm run seed -w @checkpad/functions
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { mockEvents, mockTeams } from '@checkpad/shared/mock-events';
import type { AdminDoc, AttendeeDoc, EventDoc, TeamDoc } from '../src/model.ts';

// A demo- project with the emulator host always set, so this can never write to production.
// @checkpad/shared isn't a dependency of functions (Cloud Build can't install it); the
// workspace makes it importable here.
const PROJECT = 'demo-checkpad';
const FIRESTORE = (process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080');

// The same three people on every event: try these emails, or any other for a walk-in
const attendees: [string, Omit<AttendeeDoc, 'checkedInAt' | 'source'>][] = [
	['GOOGA263293408', { email: 'attendee@sample.com', firstName: 'Sample', lastName: 'Attendee' }],
	['GOOGA263288757', { email: 'attendee-2@sample.com', firstName: 'Another', lastName: 'Attendee' }],
	['GOOGA263290115', { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }],
];

// Dashboard sign-ins, one per role (the Figma "Organisers" table). Sign in through the Auth
// emulator's Google page or an email link with any of these; anyone else gets "No access".
const admins: [string, Pick<AdminDoc, 'role' | 'teamId'> & { name?: string }][] = [
	['russal@example.com', { role: 'super-admin', teamId: null, name: 'Russal Arya' }],
	['priya@example.com', { role: 'organiser', teamId: 'gdg-sydney', name: 'Priya Natarajan' }],
	['tom@example.com', { role: 'team-member', teamId: 'gdg-sydney', name: 'Tom Becker' }],
	['sam@example.com', { role: 'organiser', teamId: 'gdg-sydney' }],
];

await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
const db = getFirestore(initializeApp({ projectId: PROJECT }));
const batch = db.batch();

for (const team of mockTeams) {
	batch.set(db.doc(`teams/${team.slug}`), { name: team.name, slug: team.slug, walkInTicketPrefix: 'GDGWALKIN' } satisfies TeamDoc);
}
const now = Timestamp.now();
for (const [email, { name, ...access }] of admins) {
	// Sam is still "Invited": no name or sign-in yet
	const doc: AdminDoc = { ...access, invitedAt: now, invitedBy: 'russal@example.com', ...(name && { name, lastSignInAt: now }) };
	batch.set(db.doc(`admins/${email}`), doc);
}

for (const event of mockEvents) {
	const ref = db.doc(`events/${event.slug}`);
	const doc: EventDoc = {
		slug: event.slug,
		name: event.name,
		description: event.description,
		status: event.selfCheckInOpen ? 'open' : 'closed',
		startsAt: Timestamp.fromDate(new Date(event.startsAt)),
		endsAt: Timestamp.fromDate(new Date(event.endsAt)),
		timeZone: event.timeZone,
		teamIds: event.teamSlug ? [event.teamSlug] : [],
		counts: { registered: attendees.length, checkedIn: 0, walkIns: 0 },
		walkInCounter: 0,
		walkInTicketPrefix: 'GDGWALKIN',
		selfWalkIns: event.selfWalkIns,
	};
	batch.set(ref, doc);
	for (const [ticket, person] of attendees) {
		batch.set(ref.collection('attendees').doc(ticket), { ...person, source: 'bevy', checkedInAt: null } satisfies AttendeeDoc);
	}
}

await batch.commit();
console.log(`Seeded ${mockEvents.length} events, ${mockTeams.length} team and ${admins.length} organisers into ${PROJECT}. Try:`);
for (const event of mockEvents) console.log(`  http://localhost:4321/${event.slug}  (${event.selfCheckInOpen ? 'open' : 'closed'})`);
for (const team of mockTeams) console.log(`  http://localhost:4321/team/${team.slug}`);
console.log(`Dashboard (npm run dev:emulators -w @checkpad/dashboard): sign in as ${admins.map(([email]) => email).join(', ')}`);
