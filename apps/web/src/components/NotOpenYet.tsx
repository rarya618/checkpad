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
	/** The event ended with check-in never opened, or was deleted, while the page was open. */
	onEnded: () => void;
	onGone: () => void;
}

// How often the page asks whether check-in has opened, on the event's day. The API's answer is
// cached for 15 seconds at the edge, so a crowd waiting at the door costs one read per 15 seconds.
const POLL_MS = 30_000;
// Failed asks in a row before the page owns up to not reaching the server
const TROUBLE_AFTER = 2;

// The event link before check-in opens, in the same card the email step uses, so the link always
// looks like the event. Two kinds of people open it early: the registered, who need to know when
// to come back, and people who saw a sign or team link and haven't got a ticket.
//
// Before the day: when it starts, Add to calendar, and, if the event has a ticket link, the way
// to get a ticket. On the day a new registration almost certainly won't be imported in time, so
// the ticket link goes, and everyone can type their email while they wait: the page watches for
// check-in opening and then moves on to the email step with it filled in, one tap from checking
// in (as a walk-in, for anyone not on the list, if the event allows it). Nothing is sent or kept
// until they tap. Past the start time it stays here, "Opens any minute", until the event ends:
// opening check-in is an organiser's job on the night, and a few minutes late isn't "closed".
export default function NotOpenYet({ event, onOpened, onEnded, onGone }: Props) {
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const now = useNow();
	const today = isEventDay(start, event.timeZone, now);
	const started = now >= start;
	const ended = now >= end;
	const [email, setEmail] = useState('');
	const latestEmail = useRef(email);
	latestEmail.current = email;
	const trouble = useOpening(event.slug, today && !ended, {
		opened: () => onOpened(latestEmail.current.trim()),
		gone: onGone,
	});
	useEffect(() => {
		if (ended) onEnded();
	}, [ended, onEnded]);

	// firestore.rules only take web addresses, but the page links to it, so never anything else
	const ticketUrl = !today && event.ticketUrl && /^https?:\/\//.test(event.ticketUrl) ? event.ticketUrl : null;
	const heading = started ? 'Opens any minute' : startsIn(start, event.timeZone, now);

	return (
		<div data-checkin-card className="flex w-full flex-col gap-8 rounded-xl border-2 border-b-6 border-med-blue bg-white px-6 py-10 sm:px-8">
			<header className="flex flex-col gap-1">
				<p className="text-base font-semibold text-med-blue">{formatSchedule(start, end, event.timeZone, { year: false })}</p>
				<h1 className="font-display text-3xl leading-tight break-words hyphens-auto">{event.name}</h1>
			</header>

			{today ? (
				<GetReady event={event} heading={heading} started={started} trouble={trouble} email={email} onEmail={setEmail} />
			) : (
				<section aria-labelledby="starts-in" className="flex flex-col gap-6">
					<div className="flex flex-col gap-2">
						<h2 id="starts-in" className="font-display text-2xl leading-tight">
							{heading}
						</h2>
						<p className="text-lg text-pretty text-med-blue">Check-in opens at the event, so come back to this link once you’re there.</p>
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
						<p className="text-lg text-pretty text-med-blue">Get a ticket first, then check in here when you arrive.</p>
					</div>
					<a href={ticketUrl} rel="noopener" className={`w-full ${buttonClass('primary', 'tall')}`}>
						Get a ticket
					</a>
				</section>
			)}
		</div>
	);
}

interface GetReadyProps {
	event: PublicEvent;
	heading: string;
	started: boolean;
	trouble: boolean;
	email: string;
	onEmail: (email: string) => void;
}

// On the day: the countdown, the email field to fill in while they wait, and one line saying
// what the page is doing: waiting (a slow pulse), ready once the address is whole (a tick, still),
// or that it can't reach the server (a hollow dot). Then, where it applies, who to find.
function GetReady({ event, heading, started, trouble, email, onEmail }: GetReadyProps) {
	const [error, setError] = useState<string | null>(null);
	const ready = useSettled(email.trim() !== '' && validateEmail(email) === null);
	// Enter, or the phone keyboard's Go, and leaving the field: there's nothing to send yet, so
	// they only check the address. Leaving an empty field says nothing.
	const check = (blurring: boolean) => {
		const problem = blurring && !email.trim() ? null : validateEmail(email);
		setError(problem);
		return !problem;
	};
	const done = (e: FormEvent) => {
		e.preventDefault();
		if (check(false)) (document.activeElement as HTMLElement | null)?.blur();
	};
	const status = trouble
		? { mark: 'trouble', text: 'Can’t reach Checkpad. Still trying' }
		: ready
			? { mark: 'ready', text: 'You’re ready. Keep this page open.' }
			: { mark: 'waiting', text: 'Waiting for check-in to open' };
	const help = [
		started && 'Waiting a while? Find one of the organisers.',
		!event.selfWalkIns && 'Not registered? Find one of the organisers at the door.',
	].filter(Boolean);

	return (
		<section aria-labelledby="starts-in" className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h2 id="starts-in" className="font-display text-2xl leading-tight">
					{heading}
				</h2>
				<p className="text-lg text-pretty text-med-blue">
					Check-in opens at the event. Type your email now, and you can check in the moment it opens.
				</p>
			</div>
			<form noValidate onSubmit={done} className="flex flex-col gap-6">
				<TextField
					label="Email"
					hint={event.selfWalkIns ? 'If you registered, use that email' : 'The one you registered with'}
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
					}}
					onBlur={() => check(true)}
				/>
				<div className="flex flex-col gap-2">
					{/* Polite, so a screen reader hears each change once rather than on every check */}
					<p role="status" className="flex items-start gap-3 text-base text-med-blue">
						<StatusMark mark={status.mark} />
						{status.text}
					</p>
					{help.map((line) => (
						<p key={line as string} className="text-base text-pretty text-med-blue">
							{line}
						</p>
					))}
				</div>
			</form>
		</section>
	);
}

/** The status line's mark, centred on its first line: a pulsing dot, a tick, or a hollow dot. */
function StatusMark({ mark }: { mark: string }) {
	if (mark === 'ready') {
		return (
			<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-1 shrink-0 text-med-blue">
				<path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		);
	}
	return mark === 'trouble' ? (
		<span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full border-2 border-med-blue" />
	) : (
		<span aria-hidden="true" data-waiting className="mt-2 size-2.5 shrink-0 rounded-full bg-med-blue" />
	);
}

/** `value`, once it has held for 600ms, so "ready" doesn't flicker on and off while someone types. */
function useSettled(value: boolean) {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		if (!value) return setSettled(false);
		const timer = setTimeout(() => setSettled(true), 600);
		return () => clearTimeout(timer);
	}, [value]);
	return settled;
}

/**
 * While `active`, asks the API whether check-in has opened: every 30 seconds while the page is in
 * view, and straight away when it comes back into view. Calls `opened` once it's open, or `gone`
 * if the event has been deleted. Returns whether the last few asks failed, for the status line;
 * a success clears it.
 */
function useOpening(slug: string, active: boolean, on: { opened: () => void; gone: () => void }) {
	const latest = useRef(on);
	latest.current = on;
	const [trouble, setTrouble] = useState(false);
	useEffect(() => {
		if (!active) return;
		let stopped = false;
		let failures = 0;
		const check = async () => {
			if (document.visibilityState !== 'visible') return;
			try {
				const event = await getEvent(slug);
				if (stopped) return;
				failures = 0;
				setTrouble(false);
				if (event.open) latest.current.opened();
			} catch (error) {
				if (stopped) return;
				if (error instanceof ApiFailure && error.code === 'not-found') return latest.current.gone();
				failures++;
				if (failures >= TROUBLE_AFTER) setTrouble(true);
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
	return active && trouble;
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
