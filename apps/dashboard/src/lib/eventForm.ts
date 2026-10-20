// Form values for New event and Event settings, and the conversions to and from an event.
import { isSlugTaken, type DashboardEvent } from './events';

export interface EventForm {
	name: string;
	slug: string;
	description: string;
	/** Wall-clock date and times in the event's time zone: "2026-09-10", "17:00". */
	date: string;
	start: string;
	end: string;
	timeZone: string;
	team: string;
	walkInTicketTitle: string;
	walkInVenue: string;
	selfWalkIns: boolean;
	selfCheckInOpen: boolean;
}

export const timeZones = [
	{ id: 'Australia/Sydney', city: 'Sydney' },
	{ id: 'Australia/Melbourne', city: 'Melbourne' },
	{ id: 'Australia/Brisbane', city: 'Brisbane' },
	{ id: 'Australia/Adelaide', city: 'Adelaide' },
	{ id: 'Australia/Hobart', city: 'Hobart' },
	{ id: 'Australia/Perth', city: 'Perth' },
	{ id: 'Pacific/Auckland', city: 'Auckland' },
];

/** "Sydney (AEST)", with the abbreviation in effect on `date` (AEDT in summer). */
export function timeZoneLabel(timeZone: string, date = new Date()) {
	const city = timeZones.find((tz) => tz.id === timeZone)?.city ?? timeZone;
	const abbr = new Intl.DateTimeFormat('en-AU', { timeZone, timeZoneName: 'short' })
		.formatToParts(date)
		.find((p) => p.type === 'timeZoneName')?.value;
	return abbr ? `${city} (${abbr})` : city;
}

/** Lowercase letters, digits and single hyphens: "September Meetup!" → "september-meetup". */
export function slugify(text: string) {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/** What a typed link is allowed to contain; keeps a trailing hyphen while typing. */
export function cleanSlug(text: string) {
	return text.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-/, '');
}

/** Four random letters and digits, without look-alikes (i, l, 1, o, 0), since links get printed. */
export function randomSuffix() {
	const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
	return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => chars[n % chars.length]).join('');
}

/** The name as a link, with `suffix` added if another event uses it already: "october-meetup-k3f9". */
export function suggestedSlug(name: string, suffix: string) {
	const base = slugify(name);
	if (!base || !isSlugTaken(base)) return base;
	let slug = `${base}-${suffix}`;
	while (isSlugTaken(slug)) slug = `${base}-${randomSuffix()}`;
	return slug;
}

function zonedParts(date: Date, timeZone: string) {
	const parts: Record<string, string> = {};
	for (const { type, value } of new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).formatToParts(date)) {
		parts[type] = value;
	}
	return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** The instant when the clock in `timeZone` shows `date` `time`. */
export function zonedToDate(date: string, time: string, timeZone: string) {
	const wall = Date.parse(`${date}T${time}:00Z`);
	// Correct by the zone's offset, twice so a guess on the other side of a DST change settles.
	let utc = wall;
	for (let i = 0; i < 2; i++) {
		const shown = zonedParts(new Date(utc), timeZone);
		utc += wall - Date.parse(`${shown.date}T${shown.time}:00Z`);
	}
	return new Date(utc);
}

export function eventToForm(event: DashboardEvent): EventForm {
	const start = zonedParts(new Date(event.startsAt), event.timeZone);
	const end = zonedParts(new Date(event.endsAt), event.timeZone);
	return {
		name: event.name,
		slug: event.slug,
		description: event.description,
		date: start.date,
		start: start.time,
		end: end.time,
		timeZone: event.timeZone,
		team: event.team,
		walkInTicketTitle: event.walkInTicketTitle,
		walkInVenue: event.walkInVenue,
		selfWalkIns: event.selfWalkIns,
		selfCheckInOpen: event.selfCheckInOpen,
	};
}

/** The note under the "Attendees can add themselves" switch. */
export function selfWalkInsNote(on: boolean) {
	return on ? 'Anyone not on the list can check in as a walk-in' : 'Anyone not on the list is sent to an organiser';
}

/** Start and end as ISO timestamps; an end at or before the start finishes the next day. */
export function formTimes(form: EventForm) {
	const start = zonedToDate(form.date, form.start, form.timeZone);
	let end = zonedToDate(form.date, form.end, form.timeZone);
	if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
	return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function formIsComplete(form: EventForm) {
	return Boolean(form.name.trim() && form.slug && form.date && form.start && form.end);
}

const labels: Record<keyof EventForm, string> = {
	name: 'event name',
	slug: 'link',
	description: 'description',
	date: 'date and time',
	start: 'date and time',
	end: 'date and time',
	timeZone: 'time zone',
	team: 'team',
	walkInTicketTitle: 'walk-in ticket title',
	walkInVenue: 'walk-in venue',
	selfWalkIns: 'walk-in switch',
	selfCheckInOpen: 'self check-in switch',
};

/** Names of the settings that differ, e.g. ["event name", "time zone"]. */
export function changedSettings(saved: EventForm, draft: EventForm) {
	const changed = (Object.keys(labels) as (keyof EventForm)[]).filter((key) => saved[key] !== draft[key]);
	return [...new Set(changed.map((key) => labels[key]))];
}

/** The "Leave without saving?" message: "You changed the event name. If you leave now, that change is lost." */
export function unsavedMessage(changed: string[]) {
	if (changed.length === 1) return `You changed the ${changed[0]}. If you leave now, that change is lost.`;
	if (changed.length === 2) return `You changed the ${changed[0]} and ${changed[1]}. If you leave now, those changes are lost.`;
	return `You changed ${changed.length} settings. If you leave now, those changes are lost.`;
}
