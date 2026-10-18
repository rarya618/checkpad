// Base URL of the organiser dashboard (apps/dashboard). Override with PUBLIC_DASHBOARD_URL.
export const DASHBOARD_URL: string =
	import.meta.env.PUBLIC_DASHBOARD_URL ??
	(import.meta.env.DEV ? 'http://localhost:5173' : 'https://checkpad-app.web.app');
