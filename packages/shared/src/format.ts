// Formats match the Figma copy: "6:24pm", "5pm", "18:24", "5-8pm AEST",
// "Thu 10 September", "Thu, 10 September 2026".

const HOUR = 3_600_000;

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
	const result: Record<string, string> = {};
	for (const { type, value } of new Intl.DateTimeFormat('en-AU', { timeZone, ...options }).formatToParts(date)) {
		result[type] = value;
	}
	return result;
}

export function formatTime(date: Date, timeZone: string) {
	const { hour, minute, dayPeriod } = parts(date, timeZone, { hour: 'numeric', minute: '2-digit', hour12: true });
	return `${hour}${minute === '00' ? '' : `:${minute}`}${dayPeriod.toLowerCase()}`;
}

export function formatDay(date: Date, timeZone: string) {
	const { weekday, day, month } = parts(date, timeZone, { weekday: 'short', day: 'numeric', month: 'long' });
	return `${weekday} ${day} ${month}`;
}

export function formatDate(date: Date, timeZone: string) {
	const { weekday, day, month, year } = parts(date, timeZone, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
	return `${weekday}, ${day} ${month} ${year}`;
}

/** 24-hour clock, used in the organiser dashboard: "18:24". */
export function formatClockTime(date: Date, timeZone: string) {
	const { hour, minute } = parts(date, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
	return `${hour}:${minute}`;
}

/** "5-8pm AEST", or "11am-1pm AEST" when the period changes. */
export function formatTimeRange(start: Date, end: Date, timeZone: string) {
	const from = formatTime(start, timeZone);
	const to = formatTime(end, timeZone);
	const samePeriod = from.slice(-2) === to.slice(-2);
	const { timeZoneName } = parts(start, timeZone, { timeZoneName: 'short' });
	return `${samePeriod ? from.slice(0, -2) : from}-${to} ${timeZoneName}`;
}

/**
 * Whether an event runs over more than one day: it ends on a later date and lasts more than 12
 * hours. An evening that runs past midnight (6pm to 1am) is still one evening.
 */
export function isMultiDay(start: Date, end: Date, timeZone: string) {
	return formatDate(start, timeZone) !== formatDate(end, timeZone) && end.getTime() - start.getTime() > 12 * HOUR;
}

/**
 * When an event runs, in the 12-hour style of the rest of this file. One evening:
 * "Thu, 10 September 2026, 5-8pm AEST", or with `year: false` "Thu 10 September · 5-8pm AEST".
 * Over several days: "Sat 14 March, 9am – Sun 15 March 2026, 5pm AEDT" (the start's year too
 * when it differs), or without the year "Sat 14 March, 9am – Sun 15 March, 5pm AEDT".
 */
export function formatSchedule(start: Date, end: Date, timeZone: string, { year = true } = {}) {
	if (!isMultiDay(start, end, timeZone)) {
		return year ? `${formatDate(start, timeZone)}, ${formatTimeRange(start, end, timeZone)}` : `${formatDay(start, timeZone)} · ${formatTimeRange(start, end, timeZone)}`;
	}
	const yearOf = (date: Date) => parts(date, timeZone, { year: 'numeric' }).year;
	const sameYear = yearOf(start) === yearOf(end);
	const from = `${formatDay(start, timeZone)}${year && !sameYear ? ` ${yearOf(start)}` : ''}, ${formatTime(start, timeZone)}`;
	const to = `${formatDay(end, timeZone)}${year ? ` ${yearOf(end)}` : ''}, ${formatTime(end, timeZone)}`;
	const { timeZoneName } = parts(start, timeZone, { timeZoneName: 'short' });
	return `${from} – ${to} ${timeZoneName}`;
}
