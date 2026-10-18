// Base URL of the attendee check-in site (apps/web). Override with VITE_WEB_URL.
export const WEB_URL: string =
	import.meta.env.VITE_WEB_URL ?? (import.meta.env.DEV ? 'http://localhost:4321' : 'https://checkpad.app');

/** "checkpad.app", shown before the slug in link fields. */
export const WEB_HOST = new URL(WEB_URL).host;

export function checkInUrl(eventSlug: string) {
	return `${WEB_URL.replace(/\/$/, '')}/${eventSlug}`;
}
