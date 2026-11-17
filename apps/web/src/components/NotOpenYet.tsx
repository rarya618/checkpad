import type { PublicEvent } from '@checkpad/shared/api';
import { buttonClass } from '@checkpad/shared/button';
import { formatSchedule } from '@checkpad/shared/format';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiFailure, getEvent } from '../lib/api';
import { calendarLink } from '../lib/calendar';
import { isEventDay, startsIn } from '../lib/countdown';
import { validateEmail } from '../lib/email';
import TextField from './TextField';

interface Props {
	event: PublicEvent;
	/** Check-in opened while the page was open: carries on to the email step with what they typed. */
	onOpened: (email: string) => void;
	/** The event was deleted while the page was open. */
	onGone: () => void;
}

// How often the page asks whether check-in has opened, on the event's day. The API's answer is
// cached for 15 seconds at the edge, so a crowd waiting at the door costs one read per 15 seconds.
const POLL_MS = 30_000;

// The event link before check-in opens, in the same card the email step uses, so the link always
// looks like the event. Two kinds of people open it early: the registered, who need to know when
// to come back, and people who saw a sign or team link and haven't got a ticket.
//
// Before the day: when it starts, Add to calendar, and, if the event has a ticket link, the way
// to get a ticket. On the day a new registration almost certainly won't be imported in time, so
// the ticket link goes, and everyone can type their email while they wait: the page watches for
// check-in opening and then moves on to the email step with it filled in, one tap from checking
// in (as a walk-in, for anyone not on the list, if the event allows it). Nothing is sent or kept
// until they tap.
export default function NotOpenYet({ event, onOpened, onGone }: Props) {
	const start = new Date(event.startsAt);
	const now = useNow();
	const today = isEventDay(start, event.timeZone, now);
	const [email, setEmail] = useState('');
	const latestEmail = useRef(email);
	latestEmail.current = email;
	useOpening(event.slug, today, (open) => (open ? onOpened(latestEmail.current.trim()) : onGone()));

	// firestore.rules only take web addresses, but the page links to it, so never anything else
	const ticketUrl = !today && event.ticketUrl && /^https?:\/\//.test(event.ticketUrl) ? event.ticketUrl : null;

	return (
		<div data-checkin-card className="flex w-full flex-col gap-8 rounded-xl border-2 border-b-6 border-med-blue bg-white px-8 py-10">
			<header className="flex flex-col gap-1">
				<p className="text-base font-semibold text-med-blue">
					{formatSchedule(start, new Date(event.endsAt), event.timeZone, { year: false })}
				</p>
				<h1 className="font-display text-3xl leading-tight break-words">{event.name}</h1>
			</header>

			{today ? (
				<GetReady event={event} startsIn={startsIn(start, event.timeZone, now)} email={email} onEmail={setEmail} />
			) : (
				<section aria-labelledby="starts-in" className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h2 id="starts-in" className="font-display text-2xl leading-tight">
							{startsIn(start, event.timeZone, now)}
						</h2>
						<p className="text-lg text-med-blue">Check-in opens at the event, so come back to this link once you’re there.</p>
					</div>
					<a href={calendarLink(event, `${location.origin}/${event.slug}`)} download={`${event.slug}.ics`} className={`w-full ${buttonClass('secondary', 'tall')}`}>
						Add to calendar
					</a>
				</section>
			)}

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

// On the day: the countdown, then the email field to fill in while they wait, and a quiet line
// saying the page is watching for check-in to open.
function GetReady({ event, startsIn, email, onEmail }: { event: PublicEvent; startsIn: string; email: string; onEmail: (email: string) => void }) {
	const [error, setError] = useState<string | null>(null);
	const [ready, setReady] = useState(false);
	// Enter, or the phone keyboard's Go: nothing to send yet, so it only checks the address
	const done = (e: FormEvent) => {
		e.preventDefault();
		const problem = validateEmail(email);
		setError(problem);
		setReady(!problem);
		if (!problem) (document.activeElement as HTMLElement | null)?.blur();
	};
	return (
		<section aria-labelledby="starts-in" className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h2 id="starts-in" className="font-display text-2xl leading-tight">
					{startsIn}
				</h2>
				<p className="text-lg text-med-blue">
					Check-in opens at the event. Type your email now, and you can check in the moment it opens.
				</p>
			</div>
			<form noValidate onSubmit={done} className="flex flex-col gap-6">
				<TextField
					label="Email"
					hint={event.selfWalkIns ? 'The one you registered with, if you did' : 'The one you registered with'}
					type="email"
					name="email"
					autoComplete="email"
					enterKeyHint="done"
					placeholder="jane@example.com"
					error={error}
					value={email}
					onChange={(e) => {
						onEmail(e.target.value);
						setError(null);
						setReady(false);
					}}
				/>
				{/* Polite, so a screen reader hears it once rather than on every check */}
				<p role="status" className="flex items-start gap-3 text-base text-med-blue">
					{/* On the first line's centre, if a large text size wraps it */}
					<span aria-hidden="true" data-waiting className="mt-2 size-2.5 shrink-0 rounded-full bg-med-blue" />
					{ready ? 'You’re ready. Keep this page open.' : 'Waiting for check-in to open'}
				</p>
			</form>
		</section>
	);
}

/**
 * While `active`, asks the API whether check-in has opened: every 30 seconds while the page is in
 * view, and straight away when it comes back into view. Calls `onChange(true)` once it's open, or
 * `onChange(false)` if the event has gone. Network trouble just waits for the next try.
 */
function useOpening(slug: string, active: boolean, onChange: (open: boolean) => void) {
	const latest = useRef(onChange);
	latest.current = onChange;
	useEffect(() => {
		if (!active) return;
		let stopped = false;
		const check = async () => {
			if (document.visibilityState !== 'visible') return;
			try {
				const event = await getEvent(slug);
				if (!stopped && event.open) latest.current(true);
			} catch (error) {
				if (!stopped && error instanceof ApiFailure && error.code === 'not-found') latest.current(false);
			}
		};
		const timer = setInterval(check, POLL_MS);
		document.addEventListener('visibilitychange', check);
		return () => {
			stopped = true;
			clearInterval(timer);
			document.removeEventListener('visibilitychange', check);
		};
	}, [slug, active]);
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
