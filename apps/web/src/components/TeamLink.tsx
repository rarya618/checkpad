import { useEffect, useState } from 'react';
import { ApiFailure, getTeamTarget, SLUG_PATTERN } from '../lib/api';
import LinkNotFound from './LinkNotFound';
import LoadFailed from './LoadFailed';
import Loading from './Loading';
import StatusScreen from './StatusScreen';

type State = { name: 'loading' | 'not-found' | 'failed' } | { name: 'no-event'; teamName: string };

// A team's permanent link for printed signs (checkpad.app/team/<slug>). Hosting serves this
// one page for every team (firebase.json); the API picks the team's open or next event,
// and the page sends the attendee there.
export default function TeamLink() {
	const [state, setState] = useState<State>({ name: 'loading' });

	useEffect(() => {
		const slug = location.pathname.split('/')[2] ?? '';
		if (!SLUG_PATTERN.test(slug)) return setState({ name: 'not-found' });
		getTeamTarget(slug).then(
			({ team, eventSlug }) => {
				if (eventSlug) location.replace(`/${eventSlug}`);
				else setState({ name: 'no-event', teamName: team.name });
			},
			(error) => setState({ name: error instanceof ApiFailure && error.code === 'not-found' ? 'not-found' : 'failed' }),
		);
	}, []);

	if (state.name === 'no-event') {
		// Figma "Team has no event (mobile-first)"
		return (
			<StatusScreen
				title="No event right now"
				subtitle={`${state.teamName} doesn’t have an event open for check-in.`}
				body="Come back to this link when the next event starts."
				homeLink={false}
			/>
		);
	}
	return state.name === 'loading' ? <Loading /> : state.name === 'not-found' ? <LinkNotFound /> : <LoadFailed />;
}
