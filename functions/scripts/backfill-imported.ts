// One-off: gives attendees imported before importedAt and importedBy existed those fields.
// importedAt is when the attendee's document was created (by the dashboard's import, or by
// the migration from the old app); importedBy is whoever ran those imports, passed with --by.
// Walk-ins and attendees that already have importedAt are left alone.
//
// Lists what it would change unless given --write. Needs gcloud application default credentials:
//   npm run backfill-imported -w @checkpad/functions -- --project checkpad-app --by you@example.com
//   npm run backfill-imported -w @checkpad/functions -- --project checkpad-app --by you@example.com --write
import { parseArgs } from 'node:util';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const { values } = parseArgs({
	options: {
		project: { type: 'string' },
		by: { type: 'string' },
		write: { type: 'boolean', default: false },
	},
});
const { project, write } = values;
const by = values.by?.trim().toLowerCase();
if (!project || !by) throw new Error('Pass --project and --by');
if (!/^[^@\s]+@[^@\s]+$/.test(by)) throw new Error(`--by should be an email: ${by}`);

initializeApp({ projectId: project });
const db = getFirestore();

const IMPORTED = ['bevy', 'luma', 'csv'];
let total = 0;
for (const event of (await db.collection('events').get()).docs) {
	const attendees = await event.ref.collection('attendees').get();
	const missing = attendees.docs.filter((a) => IMPORTED.includes(a.get('source')) && a.get('importedAt') == null);
	if (missing.length === 0) continue;
	total += missing.length;
	const times = missing.map((a) => a.createTime.toDate().toISOString()).sort();
	console.log(`${event.get('slug')}: ${missing.length} attendee${missing.length === 1 ? '' : 's'}, created ${times[0]} to ${times.at(-1)}`);
	if (!write) continue;

	for (let i = 0; i < missing.length; i += 500) {
		const batch = db.batch();
		// Fails rather than overwrites if someone changes the attendee meanwhile; run it again
		for (const a of missing.slice(i, i + 500)) batch.update(a.ref, { importedAt: a.createTime, importedBy: by }, { lastUpdateTime: a.updateTime });
		await batch.commit();
	}
}
console.log(write ? `Updated ${total} attendees as imported by ${by}.` : `${total} attendees to update as imported by ${by}. Run again with --write to save.`);
