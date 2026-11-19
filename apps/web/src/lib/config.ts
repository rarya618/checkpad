// Base URL of the organiser dashboard (apps/dashboard). Override with PUBLIC_DASHBOARD_URL.
export const DASHBOARD_URL: string =
	import.meta.env.PUBLIC_DASHBOARD_URL ??
	(import.meta.env.DEV ? 'http://localhost:5173' : 'https://manage.checkpad.app');

/** Who runs Checkpad, as Privacy and Terms name them. */
export const OPERATOR = 'Russal Arya';

/** Where people send privacy requests and ask for help (Privacy, Terms, Docs, Help). */
export const CONTACT_EMAIL = 'hello@russal.dev';
