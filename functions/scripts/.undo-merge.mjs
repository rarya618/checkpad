// One-off: puts the three merged events back as the migration left them (their old walk-ins only)
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
const [project, write] = [process.argv[2], process.argv.includes('--write')];
const old = JSON.parse(readFileSync(process.env.HOME + '/Desktop/gdg-syd-check-in-rtdb-2026-10-21.json', 'utf8')).events;
initializeApp({ projectId: project });
const db = getFirestore();
for (const legacyId of ['-OueU6Wnm9eHUqRCdFO8', '-OwvC39DWvZFDMPfhQVV', '-Ox6P3p-tfTOWXoIZLwe']) {
	const [ev] = (await db.collection('events').where('legacyId', '==', legacyId).get()).docs;
	const walkIns = Object.values(old[legacyId].attendees);
	const byEmail = new Map(walkIns.map((a) => [a.email.trim().toLowerCase(), a]));
	const docs = (await ev.ref.collection('attendees').get()).docs;
	// Refuse if anything changed since: every checked-in person is an old walk-in, at the old time
	for (const d of docs) {
		const a = d.data(); const w = byEmail.get(a.email);
		if (a.checkedInAt && (!w || a.checkedInAt.toDate().toISOString() !== new Date(w.checkinDate).toISOString())) throw new Error(`${ev.get('slug')}: ${d.id} changed since the merge`);
	}
	if (docs.filter((d) => d.get('checkedInAt')).length !== walkIns.length) throw new Error(`${ev.get('slug')}: check-ins don't match the export`);
	console.log(`${ev.get('slug')}: delete ${docs.length}, restore ${walkIns.length} walk-ins`);
	if (!write) continue;
	const keep = new Set(walkIns.map((w) => w.ticketNumber));
	const ops = [
		...docs.filter((d) => !keep.has(d.id)).map((d) => (b) => b.delete(d.ref)),
		...walkIns.filter((w) => !docs.some((d) => d.id === w.ticketNumber)).map((w) => (b) => b.create(ev.ref.collection('attendees').doc(w.ticketNumber), {
			firstName: w.firstName.trim(), lastName: w.lastName.trim(), email: w.email.trim().toLowerCase(), source: 'walk-in',
			checkedInAt: Timestamp.fromDate(new Date(w.checkinDate)),
		})),
	];
	for (let i = 0; i < ops.length; i += 400) { const b = db.batch(); ops.slice(i, i + 400).forEach((op) => op(b)); await b.commit(); }
	const want = JSON.stringify({ checkedIn: walkIns.length, registered: walkIns.length, walkIns: walkIns.length });
	let got = '';
	for (let t = 0; t < 30; t++) { const c = (await ev.ref.get()).get('counts'); got = JSON.stringify({ checkedIn: c.checkedIn, registered: c.registered, walkIns: c.walkIns }); if (got === want) break; await new Promise((r) => setTimeout(r, 3000)); }
	console.log(got === want ? `  ✓ ${got}` : `  ✗ ${got}, expected ${want}`);
}
