// Mock dashboard data until there's a backend.
import type { Attendee } from '@checkpad/shared/attendees';
import type { CheckpadEvent } from '@checkpad/shared/events';
import { mockEvents } from '@checkpad/shared/mock-events';

export interface RosterAttendee extends Attendee {
	id: string;
	/** Ticket number from the registration platform, or GDGWALKIN0001… for walk-ins. */
	ticket: string | null;
	/** Bevy's ticket title, e.g. "General admission"; set by imports. */
	ticketType?: string;
	walkIn: boolean;
}

export const currentUser = { name: 'Russal Arya', role: 'Super admin' };

// Small seeded PRNG so the mock list is identical on every load.
function random(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const FIRST = ['Amelia', 'Noah', 'Priya', 'Liam', 'Mei', 'Oliver', 'Zara', 'Ethan', 'Aisha', 'Lucas', 'Chloe', 'Arjun', 'Isla', 'Mateo', 'Hana', 'Jack', 'Sofia', 'Kai', 'Grace', 'Ravi'];
const LAST = ['Nguyen', 'Smith', 'Patel', 'Chen', 'Williams', 'Kumar', 'Brown', 'Tanaka', 'Wilson', 'Ali', 'Taylor', 'Rossi', 'Kim', 'Martin', 'Singh', 'Lee', 'Walker', 'Haddad', 'Jones', 'Garcia'];

// The first rows match the Figma table exactly.
const FIGMA_ROWS = [
	['Sample', 'Attendee', 'attendee@sample.com', 'GOOGA263293408', null],
	['Another', 'Attendee', 'attendee-2@sample.com', 'GOOGA263288757', null],
	['Third', 'Attendee', 'attendee-3@sample.com', 'GOOGA263293218', '18:24'],
	['Fourth', 'Attendee', 'attendee-4@sample.com', 'GOOGA263293331', null],
	['Fifth', 'Attendee', 'attendee-5@sample.com', 'GOOGA263289902', '17:31'],
	['Sixth', 'Attendee', 'attendee-6@sample.com', 'GOOGA263288640', null],
	['Seventh', 'Attendee', 'attendee-7@sample.com', 'GOOGA263293259', null],
] as const;

interface RosterSpec {
	registered: number;
	checkedIn: number;
	walkIns: number;
	seed: number;
	figmaRows?: boolean;
	extra?: Omit<Attendee, 'checkedInAt'>[];
	/** Exact Student ticket counts; otherwise about one in six registered people. */
	students?: { total: number; checkedIn: number };
}

// Past GDG Sydney meetups, so Analytics has history: the rows of the Figma "Analytics" table.
const meetup = (slug: string, name: string, date: string): CheckpadEvent => ({
	slug,
	name,
	description: 'Join us for our monthly meetup',
	startsAt: `${date}T17:00:00+10:00`,
	endsAt: `${date}T20:00:00+10:00`,
	timeZone: 'Australia/Sydney',
	selfWalkIns: true,
});
export const pastEvents: CheckpadEvent[] = [
	meetup('gdg-august-meetup', 'August Meetup', '2026-08-13'),
	meetup('gdg-july-meetup', 'July Meetup', '2026-07-09'),
	meetup('gdg-june-meetup', 'June Meetup', '2026-06-11'),
	meetup('gdg-may-meetup', 'May Meetup', '2026-05-14'),
	meetup('gdg-april-meetup', 'April Meetup', '2026-04-09'),
];

// September Meetup adds up to the Figma stats: 37 pre-registered + 4 walk-ins of 109, and
// 7 of 17 Student tickets checked in. The past meetups match the Figma Analytics table.
const specs: Record<string, RosterSpec> = {
	'gdg-september-meetup': { registered: 105, checkedIn: 37, walkIns: 4, seed: 9, figmaRows: true, students: { total: 17, checkedIn: 7 } },
	'gdg-august-meetup': { registered: 78, checkedIn: 34, walkIns: 1, seed: 8 },
	'gdg-july-meetup': { registered: 97, checkedIn: 43, walkIns: 4, seed: 7 },
	'gdg-june-meetup': { registered: 85, checkedIn: 31, walkIns: 2, seed: 6 },
	'gdg-may-meetup': { registered: 93, checkedIn: 46, walkIns: 5, seed: 5 },
	'gdg-april-meetup': { registered: 89, checkedIn: 38, walkIns: 3, seed: 4 },
	'checkpad-demo': {
		registered: 24,
		checkedIn: 3,
		walkIns: 0,
		seed: 1,
		extra: [{ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }],
	},
	'checkpad-demo-registered-only': {
		registered: 12,
		checkedIn: 0,
		walkIns: 0,
		seed: 2,
		extra: [{ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }],
	},
	'gdg-future-meetup': { registered: 56, checkedIn: 0, walkIns: 0, seed: 3 },
};

function buildRoster(eventSlug: string, startsAt: string, spec: RosterSpec): RosterAttendee[] {
	const rand = random(spec.seed);
	const start = new Date(startsAt).getTime();
	// Arrivals peak about 80 minutes in and tail off either side (the average of two randoms
	// is triangular), within the first 2¾ hours
	const arrival = () => new Date(start + Math.floor(((rand() + rand()) / 2) * 165) * 60_000);
	const ticket = () => `GOOGA2632${String(Math.floor(rand() * 100_000)).padStart(5, '0')}`;
	// Emails come from a shared pool of names, so the same people turn up at several
	// events (Analytics' "Returning"); unique within an event.
	const used = new Set<string>();
	const person = () => {
		for (;;) {
			const firstName = FIRST[Math.floor(rand() * FIRST.length)];
			const lastName = LAST[Math.floor(rand() * LAST.length)];
			const email = `${firstName}.${lastName}@example.com`.toLowerCase();
			if (!used.has(email)) {
				used.add(email);
				return { firstName, lastName, email };
			}
		}
	};

	const list: RosterAttendee[] = [];
	if (spec.figmaRows) {
		for (const [firstName, lastName, email, t, time] of FIGMA_ROWS) {
			const checkedInAt = time ? new Date(`${startsAt.slice(0, 10)}T${time}:00${startsAt.slice(19)}`) : null;
			list.push({ id: `${eventSlug}-${list.length}`, firstName, lastName, email, ticket: t, walkIn: false, checkedInAt });
		}
	}
	for (const a of spec.extra ?? []) {
		used.add(a.email);
		list.push({ id: `${eventSlug}-${list.length}`, ...a, ticket: ticket(), walkIn: false, checkedInAt: null });
	}
	while (list.length < spec.registered) {
		list.push({ id: `${eventSlug}-${list.length}`, ...person(), ticket: ticket(), walkIn: false, checkedInAt: null });
	}

	// Check in random registered attendees until the target count is reached.
	let checkedIn = list.filter((a) => a.checkedInAt).length;
	while (checkedIn < spec.checkedIn) {
		const a = list[Math.floor(rand() * list.length)];
		if (!a.checkedInAt) {
			a.checkedInAt = arrival();
			checkedIn++;
		}
	}

	// Bevy ticket types
	const arrived = list.filter((a) => a.checkedInAt);
	const notArrived = list.filter((a) => !a.checkedInAt);
	const students = spec.students ?? {
		total: Math.round(list.length / 6),
		checkedIn: Math.round(arrived.length / 6),
	};
	const studentIds = new Set([
		...arrived.slice(0, students.checkedIn).map((a) => a.id),
		...notArrived.slice(0, students.total - students.checkedIn).map((a) => a.id),
	]);
	for (const a of list) a.ticketType = studentIds.has(a.id) ? 'Student' : 'General admission';

	for (let i = 0; i < spec.walkIns; i++) {
		const ticket = `GDGWALKIN${String(i + 1).padStart(4, '0')}`;
		list.push({ id: `${eventSlug}-${list.length}`, ...person(), ticket, walkIn: true, checkedInAt: arrival() });
	}
	return list;
}

export function buildMockRosters(): Record<string, RosterAttendee[]> {
	return Object.fromEntries(
		[...mockEvents, ...pastEvents].map((event) => [event.slug, specs[event.slug] ? buildRoster(event.slug, event.startsAt, specs[event.slug]) : []]),
	);
}
