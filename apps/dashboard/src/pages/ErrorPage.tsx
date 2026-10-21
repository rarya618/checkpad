import { buttonClass } from '@checkpad/shared/button';
import { FirebaseError } from 'firebase/app';
import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { signOut } from '../lib/auth';
import { AuthLayout } from './SignInPages';

// Not in Figma: shown when a page can't load, usually a Firestore listener that failed. Like
// the sign-in pages, the logo above one card. Refused by the rules usually means someone changed
// your role or team while the page was open; anything else is most likely the connection.
export default function ErrorPage() {
	const error = useRouteError();
	useEffect(() => console.error(error), [error]);
	const refused = error instanceof FirebaseError && error.code === 'permission-denied';

	return (
		<AuthLayout
			title="Can’t load this page"
			description={
				refused
					? 'You don’t have access to this any more. Your role or team may have changed. Reload to see what you can access.'
					: 'Something went wrong loading the dashboard. Check the connection and reload.'
			}
		>
			<button type="button" onClick={() => location.reload()} className={`w-full ${buttonClass('primary')}`}>
				Reload
			</button>
			<button type="button" onClick={signOut} className={`w-full ${buttonClass('secondary')}`}>
				Sign out
			</button>
		</AuthLayout>
	);
}
