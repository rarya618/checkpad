// An .ics file for "Add to calendar" on the "Not open yet" screen. Built in the browser from
// what the check-in API already sends, as a data: link, so tapping it opens the phone's calendar
// (iOS) or downloads the file (Android, desktop) with no request to the server.
import type { PublicEvent } from '@checkpad/shared/api';

/** 20300314T060000Z */
const icsTime = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Commas, semicolons, backslashes and line breaks are special in iCalendar text. */
const icsText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes continue on the next line after a space (RFC 5545 3.1). */
function fold(line: string) {
	const bytes = new TextEncoder();
	const out: string[] = [];
	let current = '';
	for (const char of line) {
		if (bytes.encode(current + char).length > (out.length ? 74 : 75)) {
			out.push(current);
			current = '';
		}
		current += char;
	}
	out.push(current);
	return out.join('\r\n ');
}

/** The event, with its check-in link in the notes so it's a tap away on the night. */
export function calendarLink(event: PublicEvent, checkInUrl: string, now = new Date()) {
	const notes = [event.description, `Check in: ${checkInUrl}`].filter(Boolean).join('\n\n');
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Checkpad//Check-in//EN',
		'CALSCALE:GREGORIAN',
		'BEGIN:VEVENT',
		`UID:${event.slug}@checkpad.app`,
		`DTSTAMP:${icsTime(now.toISOString())}`,
		`DTSTART:${icsTime(event.startsAt)}`,
		`DTEND:${icsTime(event.endsAt)}`,
		`SUMMARY:${icsText(event.name)}`,
		`DESCRIPTION:${icsText(notes)}`,
		`URL:${checkInUrl}`,
		'END:VEVENT',
		'END:VCALENDAR',
	];
	return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.map(fold).join('\r\n') + '\r\n')}`;
}
