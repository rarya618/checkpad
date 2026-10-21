import type { PublicEvent } from '@checkpad/shared/api';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiFailure, getEvent, SLUG_PATTERN } from '../lib/api';
import CheckInFlow from './CheckInFlow';
import LinkNotFound from './LinkNotFound';
import LoadFailed from './LoadFailed';
import Loading from './Loading';

type State = { name: 'loading' | 'not-found' | 'failed' } | { name: 'ready'; event: PublicEvent };

// The check-in page for every event: Hosting serves this one page at /<slug> (firebase.json),
// and it asks the API for the event named in the address.
export default function EventCheckIn({ children }: { children?: ReactNode }) {
	const [state, setState] = useState<State>({ name: 'loading' });

	useEffect(() => {
		const slug = location.pathname.split('/')[1] ?? '';
		if (!SLUG_PATTERN.test(slug)) return setState({ name: 'not-found' });
		getEvent(slug).then(
			(event) => {
				document.title = `Check in · ${event.name}`;
				setState({ name: 'ready', event });
			},
			(error) => setState({ name: error instanceof ApiFailure && error.code === 'not-found' ? 'not-found' : 'failed' }),
		);
	}, []);

	if (state.name === 'ready') return <CheckInFlow event={state.event}>{children}</CheckInFlow>;
	return state.name === 'loading' ? <Loading /> : state.name === 'not-found' ? <LinkNotFound /> : <LoadFailed />;
}
