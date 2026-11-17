// Form values for New event and Event settings, and the conversions to and from an event.
import { countries } from '@checkpad/shared/countries';
import { isSlugTaken, type DashboardEvent, type EventInput } from './events';

export interface EventForm {
	name: string;
	slug: string;
	description: string;
	/** Wall-clock dates and times in the event's time zone: "2026-09-10", "17:00". `date` is the
	 *  start date; `endDate` is a later one for an event over several days, or the same. */
	date: string;
	start: string;
	endDate: string;
	end: string;
	timeZone: string;
	/** The owner team's ID; empty for none. */
	ownerTeam: string;
	/** The other teams that run it, as sorted IDs, so comparing two forms is comparing strings. */
	otherTeams: string[];
	walkInTicketTitle: string;
	walkInVenue: string;
	selfWalkIns: boolean;
	selfCheckInOpen: boolean;
}

const timeZones = countries.flatMap((c) => c.timeZones);

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
	// Year padded: Intl writes year 2 as "2", and "2-05-11" doesn't parse back
	return { date: `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
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
		endDate: end.date,
		end: end.time,
		timeZone: event.timeZone,
		ownerTeam: event.ownerTeamId ?? '',
		otherTeams: event.teamIds.filter((id) => id !== event.ownerTeamId).sort(),
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

/** What to save from the form, under `slug` (the form's, without a trailing hyphen). */
export function formToInput(form: EventForm, slug: string): EventInput {
	return {
		slug,
		name: form.name.trim(),
		description: form.description.trim(),
		...formTimes(form),
		timeZone: form.timeZone,
		...formTeams(form),
		walkInTicketTitle: form.walkInTicketTitle.trim(),
		walkInVenue: form.walkInVenue.trim(),
		selfWalkIns: form.selfWalkIns,
		selfCheckInOpen: form.selfCheckInOpen,
	};
}

/** The teams to save, owner first. Other teams need an owner: an event with none has no teams. */
export function formTeams(form: Pick<EventForm, 'ownerTeam' | 'otherTeams'>) {
	if (!form.ownerTeam) return { teamIds: [], ownerTeamId: null };
	return { teamIds: [form.ownerTeam, ...form.otherTeams.filter((id) => id !== form.ownerTeam)], ownerTeamId: form.ownerTeam };
}

/**
 * The teams after handing ownership to `owner`: the old owner stays on as another team,
 * and the new one leaves that list.
 */
export function withOwner(form: Pick<EventForm, 'ownerTeam' | 'otherTeams'>, owner: string) {
	const others = new Set(form.otherTeams);
	if (form.ownerTeam) others.add(form.ownerTeam);
	others.delete(owner);
	return { ownerTeam: owner, otherTeams: [...others].sort() };
}

/** Whether the end, on the start date at or before the start time, means the next day: an
 *  evening that runs past midnight ("18:00" to "01:00"). */
export function endsNextDay(form: Pick<EventForm, 'date' | 'endDate' | 'start' | 'end'>) {
	return Boolean(form.start && form.end) && (form.endDate || form.date) === form.date && form.end <= form.start;
}

/** Start and end as ISO timestamps. An event can run over several days (`endDate`); one that
 *  ends on its start date at or before its start time finishes the next day (endsNextDay). */
export function formTimes(form: EventForm) {
	const start = zonedToDate(form.date, form.start, form.timeZone);
	let end = zonedToDate(form.endDate || form.date, form.end, form.timeZone);
	if (endsNextDay(form)) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
	return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

/**
 * Whether a date field holds a whole date worth working with. While someone types a year the
 * browser reports it digit by digit ("0002-05-11", then "0020-05-11"), so anything before 1900
 * counts as not there yet.
 */
export function isFullDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && !Number.isNaN(Date.parse(value));
}

/**
 * What's wrong with the dates and times, or null: only an end date before the start can be.
 * Runs on every keystroke, so it says nothing until both dates are whole, and never throws.
 */
export function formTimesError(form: EventForm) {
	if (!isFullDate(form.date) || !isFullDate(form.endDate || form.date) || !form.start || !form.end || !form.timeZone) return null;
	try {
		const { startsAt, endsAt } = formTimes(form);
		return new Date(endsAt) <= new Date(startsAt) ? 'It ends before it starts. Check the end date.' : null;
	} catch {
		return null;
	}
}

/** The end date after the start date moves from `from` to `to`, by the same number of days, so
 *  an event over several days keeps its length. An empty or part-typed end date follows the start. */
export function shiftedEndDate(endDate: string, from: string, to: string) {
	if (!isFullDate(endDate) || !isFullDate(from) || !isFullDate(to)) return to;
	const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
	return new Date(Date.parse(endDate) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Whether the event runs over several days. One that only runs past midnight (it ends the
 *  next day, at or before its start time) is still a single day. */
export function isMultiDay(form: Pick<EventForm, 'date' | 'endDate' | 'start' | 'end'>) {
	if (!isFullDate(form.date) || !isFullDate(form.endDate) || form.endDate <= form.date) return false;
	return !(form.endDate === nextDay(form.date) && form.end <= form.start);
}

/** The day after `date`. */
export function nextDay(date: string) {
	return new Date(Date.parse(date) + 86_400_000).toISOString().slice(0, 10);
}

export function formIsComplete(form: EventForm) {
	const datesWhole = isFullDate(form.date) && isFullDate(form.endDate || form.date);
	return Boolean(form.name.trim() && form.slug && datesWhole && form.start && form.end) && !formTimesError(form);
}

const labels: Record<keyof EventForm, string> = {
	name: 'event name',
	slug: 'link',
	description: 'description',
	date: 'date and time',
	start: 'date and time',
	endDate: 'date and time',
	end: 'date and time',
	timeZone: 'time zone',
	ownerTeam: 'owner team',
	otherTeams: 'teams',
	walkInTicketTitle: 'walk-in ticket title',
	walkInVenue: 'walk-in venue',
	selfWalkIns: 'walk-in switch',
	selfCheckInOpen: 'self check-in switch',
};

/** Names of the settings that differ, e.g. ["event name", "time zone"]. */
export function changedSettings(saved: EventForm, draft: EventForm) {
	// String() so the sorted team lists compare by value
	const changed = (Object.keys(labels) as (keyof EventForm)[]).filter((key) => String(saved[key]) !== String(draft[key]));
	return [...new Set(changed.map((key) => labels[key]))];
}

/** The "Leave without saving?" message: "You changed the event name. If you leave now, that change is lost." */
export function unsavedMessage(changed: string[]) {
	if (changed.length === 1) return `You changed the ${changed[0]}. If you leave now, that change is lost.`;
	if (changed.length === 2) return `You changed the ${changed[0]} and ${changed[1]}. If you leave now, those changes are lost.`;
	return `You changed ${changed.length} settings. If you leave now, those changes are lost.`;
}
