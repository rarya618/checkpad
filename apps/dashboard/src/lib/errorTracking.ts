import * as Sentry from '@sentry/react';

// Error reports go to Sentry from production builds when VITE_SENTRY_DSN is set, so dev servers
// and emulator runs send nothing. Reports carry the error, its stack trace and the page, and
// nothing about the people using it: no request bodies, headers, cookies, query strings or user.
const dsn = import.meta.env.PROD ? import.meta.env.VITE_SENTRY_DSN : undefined;

if (dsn) {
	Sentry.init({
		dsn,
		environment: 'production',
		dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
	});
}

/** Reports an error the dashboard caught itself, such as the one ErrorPage shows. */
export function reportError(error: unknown) {
	if (dsn) Sentry.captureException(error);
}
