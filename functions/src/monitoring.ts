// Sends server errors to Sentry when SENTRY_DSN is set. Production reads it from
// functions/.env.checkpad-app, deployed with the functions; the emulators load
// .env.demo-checkpad instead, so tests and local runs send nothing. Reports carry the error,
// its stack trace and which function failed, and nothing about attendees: no request bodies,
// headers, cookies, query strings or user details.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		environment: 'production',
		dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
	});
}

/**
 * Reports an error and waits for it to send: once a function returns, Cloud Run may pause it
 * before a report in the background gets out.
 */
export async function reportError(error: unknown, where: string): Promise<void> {
	if (!dsn) return;
	Sentry.captureException(error, { tags: { function: where } });
	await Sentry.flush(2000);
}

/** Runs a background function, reporting anything it throws before letting it fail as usual. */
export async function tracked<T>(where: string, run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		await reportError(error, where);
		throw error;
	}
}
