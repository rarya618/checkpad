import type { CheckpadEvent, Team } from '@checkpad/shared/events';
import { useEffect, useState } from 'react';
import StatusScreen from './StatusScreen';

/** The team's event that is open for check-in (the latest, if several are), or else its
 *  next one that hasn't finished. Same rule as teamTarget in functions/src/checkin.ts. */
function target(events: CheckpadEvent[], now: Date) {
	const byStart = (a: CheckpadEvent, b: CheckpadEvent) => a.startsAt.localeCompare(b.startsAt);
	return (
		events.filter((e) => e.selfCheckInOpen).sort(byStart).at(-1) ??
		events.filter((e) => new Date(e.endsAt) > now).sort(byStart)[0]
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
