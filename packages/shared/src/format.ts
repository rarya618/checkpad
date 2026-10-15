// Formats match the Figma copy: "6:24pm", "5pm", "Thu 10 September", "Thu, 10 September 2026".

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
