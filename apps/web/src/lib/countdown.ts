// How long until an event starts, for the "Not open yet" screen: "Starts tomorrow",
// "Starts in 3 hours". Days count by the calendar in the event's own time zone, so an evening
// event seen the night before is "tomorrow" however few hours away it is.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const relative = new Intl.RelativeTimeFormat('en-AU', { numeric: 'always' });

/** "2030-03-14": the date the clock in `timeZone` shows. */
function zonedDate(date: Date, timeZone: string) {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Calendar days from `now` to `start` in `timeZone`: 0 today, 1 tomorrow. */
function daysUntil(start: Date, now: Date, timeZone: string) {
	return Math.round((Date.parse(zonedDate(start, timeZone)) - Date.parse(zonedDate(now, timeZone))) / DAY);
}

/** Whether it's the event's day (or later) by the calendar in its time zone. */
export function isEventDay(start: Date, timeZone: string, now = new Date()) {
	return daysUntil(start, now, timeZone) <= 0;
}

export function startsIn(start: Date, timeZone: string, now = new Date()) {
	const ms = start.getTime() - now.getTime();
	if (ms < MINUTE) return 'Starting now';
	// Up, so 29 minutes 50 seconds is "in 30 minutes", and never "in 60 minutes"
	if (ms < HOUR) return `Starts ${relative.format(Math.min(59, Math.ceil(ms / MINUTE)), 'minute')}`;
	const days = daysUntil(start, now, timeZone);
	if (days <= 0) return `Starts ${relative.format(Math.round(ms / HOUR), 'hour')}`;
	if (days === 1) return 'Starts tomorrow';
	if (days < 14) return `Starts ${relative.format(days, 'day')}`;
	if (days < 60) return `Starts ${relative.format(Math.round(days / 7), 'week')}`;
	if (days < 548) return `Starts ${relative.format(Math.round(days / 30.44), 'month')}`;
	return `Starts ${relative.format(Math.round(days / 365.25), 'year')}`;
}
