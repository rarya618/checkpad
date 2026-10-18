import { checkInWindow, type CheckpadEvent, type Team } from '@checkpad/shared/events';
import { useEffect, useState } from 'react';
import StatusScreen from './StatusScreen';

/** The team's event that is open for check-in, or else its next upcoming one. */
function target(events: CheckpadEvent[], now: Date) {
	return (
		events.find((e) => checkInWindow(e, now) === 'open') ??
		events.filter((e) => checkInWindow(e, now) === 'not-open').sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
	);
}

// A team's permanent link for printed signs (checkpad.app/team/<slug>). Decided in the
// browser because "open now" depends on the time it's opened, not when the site was built.
export default function TeamLink({ team, events }: { team: Team; events: CheckpadEvent[] }) {
	const [none, setNone] = useState(false);

	useEffect(() => {
		const event = target(events, new Date());
		if (event) location.replace(`/${event.slug}`);
		else setNone(true);
	}, [events]);

	if (!none) return null;
	// Figma "Team has no event (mobile-first)"
	return (
		<StatusScreen
			title="No event right now"
			subtitle={`${team.name} doesn’t have an event open for check-in.`}
			body="Come back to this link when the next event starts."
			homeLink={false}
		/>
	);
}
