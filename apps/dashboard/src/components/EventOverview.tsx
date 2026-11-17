import { buttonClass } from '@checkpad/shared/button';
import { formatSchedule } from '@checkpad/shared/format';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import arrow from '../assets/arrow-right.svg';
import copyLink from '../assets/copy-link.svg';
import download from '../assets/download.svg';
import ellipsis from '../assets/ellipsis-vertical-dark.svg';
import gift from '../assets/gift.svg';
import trash from '../assets/trash.svg';
import upload from '../assets/upload.svg';
import { checkInUrl } from '../lib/config';
import type { ImportPlan } from '../lib/attendeeImport';
import { exportAttendance, exportForBevy } from '../lib/attendeeExport';
import { ownsEvent, setSelfCheckIn, type DashboardEvent } from '../lib/events';
import { useSession } from '../lib/auth';
import { eventPhase, nowStatus } from '../lib/eventPhase';
import { showToast } from '../lib/toast';
import StatusBadge from './StatusBadge';
import Switch from './Switch';
import { useCanEditEvents, useMe } from '../lib/organisers';
import DeleteEventDialog from './DeleteEventDialog';
import Menu from './Menu';
import { eventNameBack, useTransitionLink } from '../lib/pageTransition';

// Opened rarely, and they bring the QR code and CSV libraries: loaded on first use
const ImportDialog = lazy(() => import('./ImportDialog'));
const ShareDialog = lazy(() => import('./ShareDialog'));

// Top of an event's pages: the way back, the event's name and when it is, then a bar with what
// matters on the night: whether self check-in is open (with the switch, for those who run the
// event), and the link attendees open, with Copy and Share. Edit and the ⋮ menu sit by the name.
// The bar is tinted while check-in is open, like a live event's card on Events.
export default function EventOverview({ event, checkInSwitch = true }: { event: DashboardEvent; /** Off on Settings, which has its own. */ checkInSwitch?: boolean }) {
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const [deleting, setDeleting] = useState(false);
	const [sharing, setSharing] = useState(false);
	const canEdit = useCanEditEvents();
	const toEvents = useTransitionLink('/events', eventNameBack);
	const toSettings = useTransitionLink(`/events/${event.slug}/settings`);
	const canDelete = ownsEvent(useMe(), event);
	// Importing a file, or showing a finished import again from the toast's Details
	const [importing, setImporting] = useState<{ done?: ImportPlan } | null>(null);
	return (
		// Its own layer in a view transition, so it stays put between the event's pages (index.css).
		// That puts it under the section header below, which sticks at z-10: while its ⋮ menu is
		// open it rises above, so the menu isn't hidden behind the header (only then, so the header
		// still scrolls over it).
		<section style={{ viewTransitionName: 'event-overview' }} className="relative flex flex-col gap-4 px-6 pt-3 has-[[role=menu]]:z-20 md:pt-8">
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
				<div className="flex min-w-0 flex-1 basis-64 items-start gap-1">
					{/* Back to all events, one click, level with the name */}
					<Link
						to="/events"
						onClick={toEvents}
						aria-label="All events"
						title="All events"
						className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-light-blue/60"
					>
						<img src={arrow} alt="" width={20} height={20} className="rotate-180" />
					</Link>
					<div className="flex min-w-0 flex-col gap-1">
						{/* The name arrives from the event's row on Events, and returns to it (pageTransition) */}
						<h1 style={{ viewTransitionName: 'event-title' }} className="font-display text-2xl md:text-3xl">
							{event.name}
						</h1>
						<p className="text-sm text-med-blue">{formatSchedule(start, end, event.timeZone)}</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-3">
					{canEdit && (
						<Link to={`/events/${event.slug}/settings`} onClick={toSettings} className={buttonClass('secondary')}>
							Edit
						</Link>
					)}
					{/* Figma "Attendees – more menu" */}
					<Menu
						label="More event options"
						// Square, and the height of the md buttons beside it
						buttonClassName="flex size-9 items-center justify-center rounded-lg bg-light-blue transition-colors hover:bg-light-blue-hover"
						items={[
							...(canEdit ? [{ label: 'Import attendees', icon: upload, onSelect: () => setImporting({}) }] : []),
							{ label: 'Export for Bevy', icon: download, onSelect: () => exportForBevy(event) },
							{ label: 'Export attendance (CSV)', icon: download, onSelect: () => exportAttendance(event) },
							{ label: 'Open prize draw', icon: gift, onSelect: () => window.open(`/events/${event.slug}/prize-draw`, '_blank') },
							...(canDelete ? [{ label: 'Delete event', icon: trash, separated: true, onSelect: () => setDeleting(true) }] : []),
						]}
					>
						<img src={ellipsis} alt="" width={18} height={18} />
					</Menu>
				</div>
			</div>
			<div
				className={`flex flex-col gap-3 rounded-xl border border-line px-5 py-3.5 transition-colors md:flex-row md:items-center md:gap-6 ${
					event.selfCheckInOpen ? 'bg-light-blue/40' : 'bg-white'
				}`}
			>
				<CheckInState event={event} canSwitch={checkInSwitch && canEdit} />
				<div className="hidden h-6 w-px shrink-0 bg-line md:block" />
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-3">
					<a href={checkInUrl(event.slug)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 basis-48 truncate text-sm font-semibold text-med-blue underline underline-offset-2 hover:text-dark-blue">
						{checkInUrl(event.slug).replace(/^https?:\/\//, '')}
					</a>
					<div className="flex shrink-0 items-center gap-2">
						<CopyLink url={checkInUrl(event.slug)} />
						<button type="button" onClick={() => setSharing(true)} className={buttonClass('primary', 'sm')}>
							Share
						</button>
					</div>
				</div>
			</div>
			{deleting && <DeleteEventDialog event={event} onClose={() => setDeleting(false)} />}
			<Suspense fallback={null}>
				{sharing && <ShareDialog event={event} onClose={() => setSharing(false)} />}
				{importing && (
					<ImportDialog event={event} done={importing.done} onClose={() => setImporting(null)} onImported={(plan) => setImporting({ done: plan })} />
				)}
			</Suspense>
		</section>
	);
}

/** Copies the link, saying so in place for a moment; the button keeps its width. */
function CopyLink({ url }: { url: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);
	return (
		<button
			type="button"
			onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
			className={`${buttonClass('secondary', 'sm')} inline-grid`}
		>
			{/* Both labels take the same cell, so the button is as wide as the longer */}
			<span className={`col-start-1 row-start-1 inline-flex items-center justify-center gap-2 ${copied ? 'invisible' : ''}`}>
				<img src={copyLink} alt="" width={15} height={15} />
				Copy link
			</span>
			<span aria-live="polite" className={`col-start-1 row-start-1 ${copied ? '' : 'invisible'}`}>
				{copied ? 'Copied' : ''}
			</span>
		</button>
	);
}

/** Whether attendees can check themselves in now, and the switch that opens and closes it. */
function CheckInState({ event, canSwitch }: { event: DashboardEvent; canSwitch: boolean }) {
	const me = useMe();
	const session = useSession();
	const [switching, setSwitching] = useState(false);
	const phase = eventPhase(event);
	const label = nowStatus[phase]?.label ?? (phase === 'upcoming' ? 'Not open yet' : 'Check-in closed');
	const toggle = (open: boolean) => {
		setSwitching(true);
		setSelfCheckIn(event, open, me.name ?? session?.email ?? 'An organiser')
			.then(() => showToast(open ? 'Self check-in is open' : 'Self check-in is closed'))
			.catch(() => showToast(`Couldn’t ${open ? 'open' : 'close'} self check-in. Try again.`))
			.finally(() => setSwitching(false));
	};
	return (
		<div className="flex shrink-0 items-center gap-3">
			<StatusBadge size="lg" open={event.selfCheckInOpen} label={label} />
			{canSwitch && (
				<span className={switching ? 'pointer-events-none opacity-60' : ''}>
					<Switch label="Self check-in open" checked={event.selfCheckInOpen} onChange={toggle} />
				</span>
			)}
		</div>
	);
}
