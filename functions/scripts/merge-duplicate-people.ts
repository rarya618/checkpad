// Finds people on an event's list twice under different emails, and merges the ones you pick.
// Most typed a slightly different email at the door, didn't find themselves and walked in, so
// they count as a walk-in and a no-show; others registered twice.
//
// --list writes every likely pair, across all events, to a CSV. Pairs whose emails are the same
// inbox (gmail.com ignores dots and +tags) or the same after fixing a typo (gmai.com, gmail.con)
// come marked "yes"; pairs that only share a name are left for you to mark. --apply merges each
// "yes" row: the kept ticket takes the earlier check-in (and the other's email, if its own has a
// typo) and the other ticket is deleted. It lists
// what it would do unless given --write, and skips a pair that changed since the list was made.
//   npm run merge-duplicate-people -w @checkpad/functions -- --project checkpad-app --list ~/Desktop/duplicates.csv
//   npm run merge-duplicate-people -w @checkpad/functions -- --project checkpad-app --apply ~/Desktop/duplicates.csv --write
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parseCsv, toCsv } from '../../apps/dashboard/src/lib/csv.ts';
import type { AttendeeDoc } from '../src/model.ts';

const { values } = parseArgs({
	options: {
		project: { type: 'string' },
		list: { type: 'string' },
		apply: { type: 'string' },
		write: { type: 'boolean', default: false },
	},
});
const { project, list, apply, write } = values;
if (!project || !list === !apply) throw new Error('Pass --project and one of --list or --apply');

initializeApp({ projectId: project });
const db = getFirestore();

const TYPOS: Record<string, string> = {
	'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com',
	'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.comm': 'gmail.com', 'hmail.com': 'gmail.com',
	'googlemail.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com',
	'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com',
};
/** The inbox an email reaches: +tags dropped, typos fixed, and Gmail's dots ignored. */
function inbox(email: string) {
	let [user, domain = ''] = email.trim().toLowerCase().split('@');
	domain = TYPOS[domain] ?? domain;
	user = user.split('+')[0];
	if (domain === 'gmail.com') user = user.replace(/\./g, '');
	return `${user}@${domain}`;
}
const fullName = (a: AttendeeDoc) => `${a.firstName} ${a.lastName}`.trim().toLowerCase().replace(/\s+/g, ' ');
const status = (a: AttendeeDoc) => `${a.source === 'walk-in' ? 'walk-in' : 'registered'}${a.checkedInAt ? ', checked in' : ''}`;

type Person = AttendeeDoc & { id: string };
/** Which of two tickets to keep: a registration over a walk-in, then checked in, then the earlier check-in. */
function rank(a: Person) {
	return [a.source === 'walk-in' ? 1 : 0, a.checkedInAt ? 0 : 1, a.checkedInAt?.toMillis() ?? 0, a.id] as const;
}
const better = (a: Person, b: Person) => {
	const [x, y] = [rank(a), rank(b)];
	for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? a : b;
	return a;
};

const HEADER = ['merge', 'why', 'event', 'keep ticket', 'keep name', 'keep email', 'keep', 'drop ticket', 'drop name', 'drop email', 'drop'];

if (list) {
	const out: string[][] = [HEADER];
	for (const ev of (await db.collection('events').orderBy('startsAt').get()).docs) {
		const people = (await ev.ref.collection('attendees').get()).docs.map((d) => ({ id: d.id, ...(d.data() as AttendeeDoc) }));
		const pairs: [string, string, Person, Person][] = [];
		// Same inbox first: one person for sure. Then same full name, between those people.
		const byInbox = Map.groupBy(people, (a) => inbox(a.email));
		const ones: Person[] = [];
		for (const group of byInbox.values()) {
			const keep = group.reduce(better);
			ones.push(keep);
			for (const a of group) if (a !== keep) pairs.push(['yes', a.email === keep.email ? 'same email' : 'same inbox', keep, a]);
		}
		for (const group of Map.groupBy(ones.filter((a) => fullName(a).includes(' ')), fullName).values()) {
			const keep = group.reduce(better);
			for (const a of group) if (a !== keep) pairs.push(['', 'same name', keep, a]);
		}
		for (const [merge, why, keep, drop] of pairs) {
			out.push([merge, why, ev.get('slug'), keep.id, `${keep.firstName} ${keep.lastName}`, keep.email, status(keep), drop.id, `${drop.firstName} ${drop.lastName}`, drop.email, status(drop)]);
		}
	}
	writeFileSync(list, toCsv(out), { mode: 0o600 });
	const marked = out.filter((r) => r[0] === 'yes').length;
	console.log(`${out.length - 1} pairs in ${list}: ${marked} marked yes, ${out.length - 1 - marked} to review. Put "yes" in the merge column of the ones to merge, then --apply.`);
	process.exit(0);
}

const [header, ...rows] = parseCsv(readFileSync(apply!, 'utf8')).filter((r) => r.some((c) => c.trim()));
if (header.join() !== HEADER.join()) throw new Error(`${apply} isn't a list from --list`);
const col = (name: string) => HEADER.indexOf(name);
const yes = rows.filter((r) => /^y(es)?$/i.test(r[col('merge')].trim()));
const events = new Map((await db.collection('events').get()).docs.map((d) => [d.get('slug') as string, d.ref]));
let merged = 0;
let skipped = 0;
for (const r of yes) {
	const ref = events.get(r[col('event')]);
	const [keepId, dropId] = [r[col('keep ticket')], r[col('drop ticket')]];
	const label = `${r[col('event')]}: ${r[col('drop name')]} (${r[col('drop')]}) into ${r[col('keep name')]} (${r[col('keep')]})`;
	if (!ref) {
		console.log(`Skipped, no such event: ${label}`);
		skipped++;
		continue;
	}
	const done = await db.runTransaction(async (tx) => {
		const [k, d] = await Promise.all([tx.get(ref.collection('attendees').doc(keepId)), tx.get(ref.collection('attendees').doc(dropId))]);
		const keep = k.data() as AttendeeDoc | undefined;
		const drop = d.data() as AttendeeDoc | undefined;
		// Still as listed
		if (!keep || !drop || keep.email !== r[col('keep email')] || drop.email !== r[col('drop email')] || status(keep) !== r[col('keep')] || status(drop) !== r[col('drop')]) return false;
		const first = [keep, drop].filter((a) => a.checkedInAt).sort((a, b) => a.checkedInAt!.toMillis() - b.checkedInAt!.toMillis())[0];
		// Keep a working email: someone who registered with a typo may have checked in without it
		const typo = (e: string) => e.split('@')[1] in TYPOS;
		const email = typo(keep.email) && !typo(drop.email) ? drop.email : keep.email;
		if (write) {
			tx.update(k.ref, { email, ...(first && first !== keep && { checkedInAt: first.checkedInAt, checkedInBy: first.checkedInBy ?? null }) });
			tx.delete(d.ref);
		}
		return true;
	});
	console.log(`${done ? (write ? 'Merged' : 'Would merge') : 'Skipped, changed since the list was made'}: ${label}`);
	if (done) merged++;
	else skipped++;
}
console.log(`${write ? 'Merged' : 'Would merge'} ${merged} pairs${skipped ? `, skipped ${skipped}` : ''}.${write ? ' The trigger updates each event’s counts.' : ' Run again with --write to save.'}`);
