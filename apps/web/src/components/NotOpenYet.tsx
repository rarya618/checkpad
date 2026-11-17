import type { PublicEvent } from '@checkpad/shared/api';
import { buttonClass } from '@checkpad/shared/button';
import { formatSchedule } from '@checkpad/shared/format';
import { useEffect, useState } from 'react';
import { calendarLink } from '../lib/calendar';
import { startsIn } from '../lib/countdown';

// The event link before check-in opens. Two kinds of people open it early: the registered, who
// need to know when to come back, and people who saw a sign or team link and haven't got a
// ticket. One card, the same one the email step uses, so the link always looks like the event:
// when it starts and when to come back first, then, if the event has a ticket link, the way to get
// a ticket, set apart under its own heading.
export default function NotOpenYet({ event }: { event: PublicEvent }) {
	const start = new Date(event.startsAt);
	const now = useNow();
	// firestore.rules only take web addresses, but the page links to it, so never anything else
	const ticketUrl = event.ticketUrl && /^https?:\/\//.test(event.ticketUrl) ? event.ticketUrl : null;
	const checkInUrl = `${location.origin}/${event.slug}`;

	return (
		<div data-checkin-card className="flex w-full flex-col gap-8 rounded-xl border-2 border-b-6 border-med-blue bg-white px-8 py-10">
			<header className="flex flex-col gap-1">
				<p className="text-base font-semibold text-med-blue">
					{formatSchedule(start, new Date(event.endsAt), event.timeZone, { year: false })}
				</p>
				<h1 className="font-display text-3xl leading-tight break-words">{event.name}</h1>
			</header>

			<section aria-labelledby="starts-in" className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h2 id="starts-in" className="font-display text-2xl leading-tight">
						{startsIn(start, event.timeZone, now)}
					</h2>
					<p className="text-lg text-med-blue">Check-in opens at the event, so come back to this link once you’re there.</p>
				</div>
				<a href={calendarLink(event, checkInUrl)} download={`${event.slug}.ics`} className={`w-full ${buttonClass('secondary', 'tall')}`}>
					Add to calendar
				</a>
			</section>

			{ticketUrl && (
				<section aria-labelledby="get-a-ticket" className="flex flex-col gap-6 border-t-2 border-light-blue pt-8">
					<div className="flex flex-col gap-2">
						<h2 id="get-a-ticket" className="font-display text-2xl leading-tight">
							Not registered yet?
						</h2>
						<p className="text-lg text-med-blue">Get a ticket first, then check in here on the night.</p>
					</div>
					<a href={ticketUrl} rel="noopener" className={`w-full ${buttonClass('primary', 'tall')}`}>
						Get a ticket
					</a>
				</section>
			)}
		</div>
	);
}

/** The time now, moved on every 30 seconds and whenever the page comes back into view, so the countdown keeps up. */
function useNow() {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const tick = () => setNow(new Date());
		const timer = setInterval(tick, 30_000);
		document.addEventListener('visibilitychange', tick);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', tick);
		};
	}, []);
	return now;
}
