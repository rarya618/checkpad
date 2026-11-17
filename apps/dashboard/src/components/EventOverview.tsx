import { buttonClass } from '@checkpad/shared/button';
import { formatSchedule } from '@checkpad/shared/format';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router';
import tick from '../assets/check-blue.svg';
import chevron from '../assets/chevron-down.svg';
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
import { useCanEditEvents, useMe } from '../lib/organisers';
import DeleteEventDialog from './DeleteEventDialog';
import Menu from './Menu';
import { eventNameBack, useTransitionLink } from '../lib/pageTransition';

// Opened rarely, and they bring the QR code and CSV libraries: loaded on first use
const ImportDialog = lazy(() => import('./ImportDialog'));
const ShareDialog = lazy(() => import('./ShareDialog'));

// Top of an event's pages, one compact block: the event's name with Share, Edit and the ⋮ menu;
// under it one quiet line with when it is, whether self check-in is open (which opens and closes
// it, for those who run the event), and the attendees' link with a copy icon. A hairline closes it off from the
// page's own header below. A back arrow at the heading's weight leads the name.
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
	const url = checkInUrl(event.slug);
	return (
		// Its own layer in a view transition, so it stays put between the event's pages (index.css).
		// That puts it under the section header below, which sticks at z-10: while its ⋮ menu is
		// open it rises above, so the menu isn't hidden behind the header (only then, so the header
		// still scrolls over it).
		<section style={{ viewTransitionName: 'event-overview' }} className="relative mx-6 flex flex-col gap-2 border-b border-line pt-3 pb-5 has-[[role=menu]]:z-20 md:pt-8">
			<div className="flex flex-wrap items-start gap-x-6 gap-y-4">
				{/* Each row has one job: the name, then one quiet line of facts. The buttons follow on
				    phones, after the details rather than between them */}
				{/* The back arrow leads the name like part of the heading, at its weight, and the line
				    under the name starts where the name does */}
				<div className="grid min-w-0 flex-1 basis-80 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
					<Link
						to="/events"
						onClick={toEvents}
						aria-label="All events"
						title="All events"
						className="-m-1 flex items-center justify-center rounded-md p-1 text-dark-blue transition-colors hover:bg-light-blue/60"
					>
						<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" className="size-6 md:size-7">
							<path d="M19 12H5M11 18l-6-6 6-6" />
						</svg>
					</Link>
					{/* The name arrives from the event's row on Events, and returns to it (pageTransition) */}
					<h1 style={{ viewTransitionName: 'event-title' }} className="min-w-0 font-display text-2xl md:text-3xl">
						{event.name}
					</h1>
					{/* When it is · whether self check-in is open · the attendees' link, in one voice. Phones
					    give each its own line, so the separators only show from md */}
					<div className="col-start-2 flex min-w-0 flex-col items-start gap-1 text-sm leading-normal text-med-blue md:flex-row md:flex-wrap md:items-center md:gap-x-2">
						<span>{formatSchedule(start, end, event.timeZone)}</span>
						<span aria-hidden="true" className="hidden md:inline">
							·
						</span>
						<CheckInState event={event} canSwitch={checkInSwitch && canEdit} />
						<span aria-hidden="true" className="hidden md:inline">
							·
						</span>
						<span className="flex min-w-0 items-center gap-1">
							<a href={url} target="_blank" rel="noreferrer" className="truncate underline underline-offset-2 hover:text-dark-blue">
								{url.replace(/^https?:\/\//, '')}
							</a>
							<CopyLink url={url} />
						</span>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<button type="button" onClick={() => setSharing(true)} className={buttonClass('secondary')}>
						Share
					</button>
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
							...(canEdit
								? [
										{
											label: 'Import attendees',
											icon: upload,
											onSelect: () => setImporting({}),
										},
									]
								: []),
							{
								label: 'Export for Bevy',
								icon: download,
								onSelect: () => exportForBevy(event),
							},
							{
								label: 'Export attendance (CSV)',
								icon: download,
								onSelect: () => exportAttendance(event),
							},
							{
								label: 'Open prize draw',
								icon: gift,
								onSelect: () => window.open(`/events/${event.slug}/prize-draw`, '_blank'),
							},
							...(canDelete
								? [
										{
											label: 'Delete event',
											icon: trash,
											separated: true,
											onSelect: () => setDeleting(true),
										},
									]
								: []),
						]}
					>
						<img src={ellipsis} alt="" width={18} height={18} />
					</Menu>
				</div>
			</div>
			{deleting && <DeleteEventDialog event={event} onClose={() => setDeleting(false)} />}
			<Suspense fallback={null}>
				{sharing && <ShareDialog event={event} onClose={() => setSharing(false)} />}
				{importing && <ImportDialog event={event} done={importing.done} onClose={() => setImporting(null)} onImported={(plan) => setImporting({ done: plan })} />}
			</Suspense>
		</section>
	);
}

/** Copies the link: a small icon beside it that turns to a tick for a moment. */
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
			aria-label={copied ? 'Copied' : 'Copy check-in link'}
			title={copied ? 'Copied' : 'Copy link'}
			onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
			className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-light-blue/60"
		>
			<img src={copied ? tick : copyLink} alt="" width={15} height={15} />
		</button>
	);
}

/**
 * Whether attendees can check themselves in now. For those who run the event the status is
 * also the control: pressing it offers to open or close self check-in.
 */
function CheckInState({ event, canSwitch }: { event: DashboardEvent; canSwitch: boolean }) {
	const me = useMe();
	const session = useSession();
	const phase = eventPhase(event);
	const label = nowStatus[phase]?.label ?? (phase === 'upcoming' ? 'Not open yet' : 'Check-in closed');
	const status = <StatusBadge open={event.selfCheckInOpen} label={label} />;
	if (!canSwitch) return status;
	const open = !event.selfCheckInOpen;
	return (
		<Menu
			label={`${label}: change self check-in`}
			placement="below-left"
			buttonClassName="-mx-1.5 flex items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-light-blue/60 aria-expanded:bg-light-blue/60"
			items={[
				{
					label: open ? 'Open self check-in' : 'Close self check-in',
					detail: open ? 'Attendees can check themselves in' : 'Staff can still check people in',
					onSelect: () =>
						setSelfCheckIn(event, open, me.name ?? session?.email ?? 'An organiser')
							.then(() => showToast(open ? 'Self check-in is open' : 'Self check-in is closed'))
							.catch(() => showToast(`Couldn’t ${open ? 'open' : 'close'} self check-in. Try again.`)),
				},
			]}
		>
			{status}
			<img src={chevron} alt="" width={14} height={14} />
		</Menu>
	);
}
