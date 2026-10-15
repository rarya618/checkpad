// Mock dashboard data until there's a backend.
import type { Attendee } from '@checkpad/shared/attendees';
import { mockEvents } from '@checkpad/shared/mock-events';

export interface RosterAttendee extends Attendee {
	id: string;
	/** Ticket number from the registration platform; walk-ins have none. */
	ticket: string | null;
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
}

// September Meetup adds up to the Figma stats: 37 pre-registered + 4 walk-ins of 109.
const specs: Record<string, RosterSpec> = {
	'gdg-september-meetup': { registered: 105, checkedIn: 37, walkIns: 4, seed: 9, figmaRows: true },
	'checkpad-demo': {
		registered: 24,
		checkedIn: 3,
		walkIns: 0,
		seed: 1,
		extra: [{ email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' }],
	},
	'gdg-future-meetup': { registered: 56, checkedIn: 0, walkIns: 0, seed: 3 },
};

function buildRoster(eventSlug: string, startsAt: string, spec: RosterSpec): RosterAttendee[] {
	const rand = random(spec.seed);
	const start = new Date(startsAt).getTime();
	const arrival = () => new Date(start + Math.floor(rand() * 150) * 60_000); // within 2.5h of start
	const ticket = () => `GOOGA2632${String(Math.floor(rand() * 100_000)).padStart(5, '0')}`;
	const person = (i: number) => {
		const firstName = FIRST[Math.floor(rand() * FIRST.length)];
		const lastName = LAST[Math.floor(rand() * LAST.length)];
		return { firstName, lastName, email: `${firstName}.${lastName}${i}@example.com`.toLowerCase() };
	};

	const list: RosterAttendee[] = [];
	if (spec.figmaRows) {
		for (const [firstName, lastName, email, t, time] of FIGMA_ROWS) {
			const checkedInAt = time ? new Date(`${startsAt.slice(0, 10)}T${time}:00${startsAt.slice(19)}`) : null;
			list.push({ id: `${eventSlug}-${list.length}`, firstName, lastName, email, ticket: t, walkIn: false, checkedInAt });
		}
	}
	for (const a of spec.extra ?? []) {
		list.push({ id: `${eventSlug}-${list.length}`, ...a, ticket: ticket(), walkIn: false, checkedInAt: null });
	}
	while (list.length < spec.registered) {
		list.push({ id: `${eventSlug}-${list.length}`, ...person(list.length), ticket: ticket(), walkIn: false, checkedInAt: null });
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
	for (let i = 0; i < spec.walkIns; i++) {
		list.push({ id: `${eventSlug}-${list.length}`, ...person(list.length), ticket: null, walkIn: true, checkedInAt: arrival() });
	}
	return list;
}

export function buildMockRosters(): Record<string, RosterAttendee[]> {
	return Object.fromEntries(
		mockEvents.map((event) => [event.slug, specs[event.slug] ? buildRoster(event.slug, event.startsAt, specs[event.slug]) : []]),
	);
}
