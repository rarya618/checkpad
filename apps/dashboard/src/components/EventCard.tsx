import { buttonClass } from '@checkpad/shared/button';
import { formatClockTime, formatDate } from '@checkpad/shared/format';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import download from '../assets/download.svg';
import ellipsis from '../assets/ellipsis-vertical.svg';
import link from '../assets/link.svg';
import sliders from '../assets/sliders.svg';
import trash from '../assets/trash.svg';
import { exportAttendance, exportForBevy } from '../lib/attendeeExport';
import { useSession } from '../lib/auth';
import { checkInUrl } from '../lib/config';
import { eventPhase, groupOf, ringStatus, startsToday, type EventPhase } from '../lib/eventPhase';
import { ownsEvent, setSelfCheckIn, type EventSummary } from '../lib/events';
import { useCanEditEvents, useMe } from '../lib/organisers';
import { showToast } from '../lib/toast';
import { useIsDesktop } from '../lib/useMediaQuery';
import CheckInRing from './CheckInRing';
import DeleteEventDialog from './DeleteEventDialog';
import Menu from './Menu';
import StatusBadge from './StatusBadge';

// The badge says what self check-in is doing; filled while attendees can check themselves in
const statuses: Record<EventPhase, { label: string; open: boolean }> = {
	live: { label: 'Check-in open', open: true },
	'stale-open': { label: 'Still open', open: true },
	today: { label: 'Not open yet', open: false },
	'closed-early': { label: 'Check-in closed', open: false },
	upcoming: { label: 'Upcoming', open: false },
	past: { label: 'Closed', open: false },
};

/** "Today · 18:00–21:00", "Thu, 14 March 2030 · 18:00–21:00", or a date range when it runs over several days. */
function when(start: Date, end: Date, timeZone: string, today: boolean) {
	if (formatDate(start, timeZone) !== formatDate(end, timeZone)) return `${formatDate(start, timeZone)} – ${formatDate(end, timeZone)}`;
	const times = `${formatClockTime(start, timeZone)}–${formatClockTime(end, timeZone)}`;
	return `${today ? 'Today' : formatDate(start, timeZone)} · ${times}`;
}

export default function EventCard({ summary, team }: { summary: EventSummary; /** Shown when the viewer sees several teams' events. */ team?: string }) {
	const { event, stats } = summary;
	const phase = eventPhase(event);
	const status = statuses[phase];
	const ring = ringStatus[phase];
	const featured = groupOf(phase) === 'now';
	const [deleting, setDeleting] = useState(false);
	const [switching, setSwitching] = useState(false);
	const canEdit = useCanEditEvents();
	const me = useMe();
	const session = useSession();
	const canDelete = ownsEvent(me, event);
	const desktop = useIsDesktop();
	const id = useId();
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const checkInPath = `/events/${event.slug}/check-in`;
	// Taller buttons on phones, a comfortable tap while greeting people
	const size = desktop ? 'md' : 'tall';

	const count =
		ring === 'not-open'
			? `${stats.total} registered`
			: `${stats.checkedIn} of ${stats.total} ${ring === 'closed' ? 'attended' : 'checked in'}`;

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

	return (
		<article
			className={`relative flex items-start justify-between gap-3 rounded-xl border py-5 pr-4 pl-5 md:items-center md:gap-6 md:px-7 md:py-6 ${
				phase === 'live' ? 'border-dark-blue bg-light-blue/40 hover:bg-light-blue/60' : `bg-white hover:bg-off-white/60 ${featured ? 'border-dark-blue' : 'border-med-blue'}`
			}`}
		>
			<div className="flex min-w-0 items-start gap-4 md:items-center md:gap-7.5">
				<CheckInRing checkedIn={stats.checkedIn} total={stats.total} status={ring} size={desktop ? 'md' : 'sm'} />
				<div className="flex min-w-0 flex-col items-start gap-3 md:gap-4">
					<div className="flex flex-col items-start gap-2 md:gap-1.5">
						<h3 className="font-display text-lg leading-normal md:text-2xl">
							{/* Stretched link: the whole card opens the event, except its buttons */}
							<Link to={`/events/${event.slug}`} aria-describedby={`${id}-status ${id}-count`} className="after:absolute after:inset-0 after:rounded-xl">
								{event.name}
							</Link>
						</h3>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
							<span id={`${id}-status`}>
								<StatusBadge open={status.open} label={status.label} />
							</span>
							<p className="text-sm leading-normal font-medium tracking-tight text-black">
								{phase === 'stale-open' ? `Ended ${formatDate(end, event.timeZone)}` : when(start, end, event.timeZone, startsToday(event))}
							</p>
							{team && <p className="text-sm leading-normal tracking-tight text-dark-blue/75">{team}</p>}
							<span id={`${id}-count`} className="sr-only">
								{count}
							</span>
						</div>
					</div>
					{phase === 'stale-open' && (
						<p className="text-sm leading-normal text-black">
							Attendees can still check themselves in.{canEdit ? '' : ' Ask an organiser to close check-in.'}
						</p>
					)}
					{!featured && event.description && <p className="line-clamp-2 text-sm leading-normal whitespace-pre-line text-black">{event.description}</p>}
					{actions && <div className="relative flex flex-wrap gap-3 *:whitespace-nowrap">{actions}</div>}
				</div>
			</div>
			{/* Figma "Events – card menu". relative lifts it above the card's stretched link; a 44px target on phones. */}
			<div className="relative -mt-2.5 -mr-2.5 shrink-0 md:m-0">
				<Menu
					label={`Options for ${event.name}`}
					buttonClassName="flex size-11 items-center justify-center rounded-md hover:bg-light-blue/60 md:size-auto md:p-1"
					items={[
						...(canEdit ? [{ label: 'Settings', icon: sliders, to: `/events/${event.slug}/settings` }] : []),
						{
							label: 'Copy check-in link',
							icon: link,
							onSelect: () => navigator.clipboard.writeText(checkInUrl(event.slug)).then(() => showToast('Check-in link copied')),
						},
						{ label: 'Export for Bevy', icon: download, onSelect: () => exportForBevy(event) },
						{ label: 'Export attendance (CSV)', icon: download, onSelect: () => exportAttendance(event) },
						...(canDelete ? [{ label: 'Delete event', icon: trash, separated: true, onSelect: () => setDeleting(true) }] : []),
					]}
				>
					<img src={ellipsis} alt="" width={18} height={18} />
				</Menu>
			</div>
			{deleting && <DeleteEventDialog event={event} onClose={() => setDeleting(false)} />}
		</article>
	);
}
