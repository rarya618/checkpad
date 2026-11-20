import { buttonClass } from '@checkpad/shared/button';
import { FirebaseError } from 'firebase/app';
import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { signOut } from '../lib/auth';
import { reportError } from '../lib/errorTracking';
import { AuthLayout } from './SignInPages';

// Not in Figma: shown when a page can't load, usually a Firestore listener that failed. Laid out
// like the sign-in pages. Refused by the rules usually means someone changed
// your role or team while the page was open; anything else is most likely the connection.
export default function ErrorPage() {
	const error = useRouteError();
	const refused = error instanceof FirebaseError && error.code === 'permission-denied';
	// A refusal is expected when someone's role changes, so only other failures go to Sentry
	useEffect(() => {
		console.error(error);
		if (!refused) reportError(error);
	}, [error, refused]);

	return (
		<AuthLayout
			title="Can’t load this page"
			description={
				refused
					? 'You don’t have access to this any more. Your role or team may have changed. Reload to see what you can access.'
					: 'Something went wrong loading the dashboard. Check the connection and reload.'
			}
		>
			<div className="flex flex-wrap gap-3">
				<button type="button" onClick={() => location.reload()} className={buttonClass('primary', 'tall')}>
					Reload
				</button>
				<button type="button" onClick={signOut} className={buttonClass('secondary', 'tall')}>
					Sign out
				</button>
			</div>
		</AuthLayout>
	);
}
