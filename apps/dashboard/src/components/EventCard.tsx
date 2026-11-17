import { buttonClass } from '@checkpad/shared/button';
import { formatClockTime, formatDate, formatDay, isMultiDay } from '@checkpad/shared/format';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '../lib/auth';
import { eventPhase, startsToday, type EventPhase } from '../lib/eventPhase';
import { setSelfCheckIn, type EventSummary } from '../lib/events';
import { useCanEditEvents, useMe } from '../lib/organisers';
import { eventNameOut, useTransitionLink } from '../lib/pageTransition';
import { preloadRoster } from '../lib/roster';
import { showToast } from '../lib/toast';
import { useIsDesktop, useMediaQuery } from '../lib/useMediaQuery';
import CheckInBar from './CheckInBar';
import EventMenu from './EventMenu';
import RollingCount from './RollingCount';
import StatusBadge from './StatusBadge';

// The badge says what self check-in is doing; filled while attendees can check themselves in.
// Only Now's phases reach this card: upcoming and past events are rows (EventRow).
const statuses: Partial<Record<EventPhase, { label: string; open: boolean }>> = {
	live: { label: 'Check-in open', open: true },
	'stale-open': { label: 'Still open', open: true },
	today: { label: 'Not open yet', open: false },
	'closed-early': { label: 'Check-in closed', open: false },
};

/**
 * "Today · 18:00–21:00" or "Thu, 14 March 2030 · 18:00–21:00"; an evening that ends after
 * midnight is still one evening ("Today · 18:00–01:00"). Over several days, both ends:
 * "Sat 14 March, 09:00 – Sun 15 March, 17:00", with years when they differ.
 */
function when(start: Date, end: Date, timeZone: string, today: boolean) {
	if (isMultiDay(start, end, timeZone)) {
		const year = (d: Date) => d.toLocaleDateString('en-AU', { timeZone, year: 'numeric' });
		const day = (d: Date) => `${formatDay(d, timeZone)}${year(start) === year(end) ? '' : ` ${year(d)}`}`;
		return `${day(start)}, ${formatClockTime(start, timeZone)} – ${day(end)}, ${formatClockTime(end, timeZone)}`;
	}
	const times = `${formatClockTime(start, timeZone)}–${formatClockTime(end, timeZone)}`;
	return `${today ? 'Today' : formatDate(start, timeZone)} · ${times}`;
}

/**
 * An event on now: open, on today, or left open after it ended. Built for a glance on the night,
 * around the live count and the way into checking people in. The count sits beside the name on
 * desktop, and between the name and the buttons on phones.
 */
export default function EventCard({ summary, team }: { summary: EventSummary; /** Shown when the viewer sees several teams' events. */ team?: string }) {
	const { event, stats } = summary;
	const phase = eventPhase(event);
	const status = statuses[phase] ?? statuses.today!;
	const [switching, setSwitching] = useState(false);
	const canEdit = useCanEditEvents();
	const me = useMe();
	const session = useSession();
	const desktop = useIsDesktop();
	// Side by side needs a wide window: below 1280px the sidebar leaves the name too little room
	const wide = useMediaQuery('(min-width: 1280px)');
	const id = useId();
	const open = useTransitionLink(`/events/${event.slug}`, eventNameOut);
	// The press or focus that comes before a click starts the attendees loading
	const preload = () => preloadRoster(event.id);
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const checkInPath = `/events/${event.slug}/check-in`;
	// Taller buttons on phones, a comfortable tap while greeting people
	const size = desktop ? 'md' : 'tall';

	const switchSelfCheckIn = (open: boolean) => {
		setSwitching(true);
		setSelfCheckIn(event, open, me.name ?? session?.email ?? 'An organiser')
			.then(() => showToast(open ? 'Self check-in is open' : 'Self check-in is closed'))
			.catch(() => showToast(`Couldn’t ${open ? 'open' : 'close'} self check-in. Try again.`))
			.finally(() => setSwitching(false));
	};

	// On-the-night actions, above the card's stretched link
	const actions =
		phase === 'live' ? (
			<Link to={checkInPath} className={buttonClass('primary', size)}>
				Check in
			</Link>
		) : phase === 'today' ? (
			<>
				{canEdit && (
					<button type="button" disabled={switching} onClick={() => switchSelfCheckIn(true)} className={buttonClass('primary', size)}>
						Open check-in
					</button>
				)}
				<Link to={checkInPath} className={buttonClass(canEdit ? 'secondary' : 'primary', size)}>
					Check in
				</Link>
			</>
		) : phase === 'closed-early' ? (
			<Link to={checkInPath} className={buttonClass('secondary', size)}>
				Check in
			</Link>
		) : phase === 'stale-open' && canEdit ? (
			<button type="button" disabled={switching} onClick={() => switchSelfCheckIn(false)} className={buttonClass('secondary', size)}>
				Close check-in
			</button>
		) : null;

	const buttons = (actions || phase === 'stale-open') && (
		<div className="flex flex-col items-start gap-3">
			{phase === 'stale-open' && <p className="text-sm leading-normal">Attendees can still check themselves in.{canEdit ? '' : ' Ask an organiser to close check-in.'}</p>}
			{actions && <div className="relative flex flex-wrap gap-3 *:whitespace-nowrap">{actions}</div>}
		</div>
	);

	const walkIns = stats.walkIns === 1 ? '1 walk-in' : `${stats.walkIns} walk-ins`;

	const count = (
		<div className="flex flex-col gap-2.5">
			<p id={`${id}-count`} className="flex items-baseline justify-between gap-4">
				<span className="flex items-baseline gap-2">
					<RollingCount value={stats.checkedIn} className="font-display text-4xl leading-none" />
					<span className="text-base leading-none text-med-blue">checked in</span>
				</span>
				<span className="flex items-baseline gap-2">
					<span className="text-base leading-none text-med-blue">of</span>
					<span className="font-display text-2xl leading-none tabular-nums">{stats.total}</span>
				</span>
			</p>
			<CheckInBar stats={stats} />
			<p className="text-sm leading-normal text-dark-blue/80 tabular-nums">
				{stats.preRegistered} pre-registered · {walkIns}
			</p>
		</div>
	);

	return (
		// Wide windows: what and when on the left with the buttons under them, the count on the
		// right. Narrower: one column, the count between the name and the buttons.
		<article
			className={`relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-5 rounded-xl border border-line px-5 py-5 md:px-7 md:py-6 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)_auto] xl:items-center xl:gap-x-10 ${
				phase === 'live' ? 'bg-light-blue/40 hover:bg-light-blue/60' : 'bg-white hover:bg-off-white/60'
			}`}
		>
			<div className="flex min-w-0 flex-col items-start gap-4">
				<div className="flex flex-col items-start gap-2">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
						{/* flex, so the wrapper is the indicator's own height and its label shares the date's line */}
						<span id={`${id}-status`} className="flex">
							<StatusBadge open={status.open} label={status.label} />
						</span>
						<p className="text-sm leading-normal font-medium tracking-tight">
							{phase === 'stale-open' ? `Ended ${formatDate(end, event.timeZone)}` : when(start, end, event.timeZone, startsToday(event))}
						</p>
						{team && <p className="text-sm leading-normal text-med-blue">{team}</p>}
					</div>
					{/* The name travels to the event's page title when the card is opened (pageTransition) */}
					<h3 data-event-name={event.slug} className="font-display text-xl md:text-2xl">
						{/* Stretched link: the whole card opens the event, except its buttons and menu */}
						<Link to={`/events/${event.slug}`} onClick={open} onPointerDown={preload} onFocus={preload} aria-describedby={`${id}-status ${id}-count`} className="after:absolute after:inset-0 after:rounded-xl">
							{event.name}
						</Link>
					</h3>
				</div>
				{wide && buttons}
			</div>
			<EventMenu event={event} className="-mt-2.5 -mr-2.5 self-start md:-mt-1 md:-mr-2 xl:col-start-3" />
			<div className="col-span-2 xl:col-span-1 xl:col-start-2 xl:row-start-1">{count}</div>
			{!wide && buttons && <div className="col-span-2">{buttons}</div>}
		</article>
	);
}
