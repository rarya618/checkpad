import { buttonClass } from '@checkpad/shared/button';
import { formatDate, formatTimeRange } from '@checkpad/shared/format';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import clipboard from '../assets/clipboard.svg';
import download from '../assets/download.svg';
import ellipsis from '../assets/ellipsis-vertical-dark.svg';
import gift from '../assets/gift.svg';
import trash from '../assets/trash.svg';
import upload from '../assets/upload.svg';
import { checkInUrl } from '../lib/config';
import { exportAttendees, type ImportPlan } from '../lib/bevy';
import type { DashboardEvent } from '../lib/events';
import { useCanEditEvents } from '../lib/organisers';
import DeleteEventDialog from './DeleteEventDialog';
import ImportDialog from './ImportDialog';
import Menu from './Menu';
import ShareDialog from './ShareDialog';

// Top of an event's pages: breadcrumbs, event name, date, check-in link, actions.
export default function EventOverview({ event }: { event: DashboardEvent }) {
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const [deleting, setDeleting] = useState(false);
	const [sharing, setSharing] = useState(false);
	const canEdit = useCanEditEvents();
	// Importing a file, or showing a finished import again from the toast's Details
	const [importing, setImporting] = useState<{ done?: ImportPlan } | null>(null);
	return (
		<section className="flex items-center gap-3 px-6 pt-[54px]">
			<div className="flex min-w-0 flex-1 flex-col gap-3.5 py-px">
				<nav aria-label="Breadcrumb">
					<ol className="flex items-center gap-1.5 text-[15px] text-black">
						<li>
							<Link to="/events" className="tracking-tight hover:underline">
								Events
							</Link>
						</li>
						<li aria-hidden="true">/</li>
						<li aria-current="page" className="font-display">
							{event.name}
						</li>
					</ol>
				</nav>
				<div className="flex flex-col gap-[4.5px]">
					<h1 className="font-display text-3xl">{event.name}</h1>
					<p className="text-[15px] font-semibold tracking-tight text-black">
						{formatDate(start, event.timeZone)}, {formatTimeRange(start, end, event.timeZone)}
					</p>
				</div>
				<CheckInLink url={checkInUrl(event.slug)} />
			</div>
			<div className="flex shrink-0 items-center gap-[15px]">
				{canEdit && (
					<Link to={`/events/${event.slug}/settings`} className={buttonClass('secondary')}>
						Edit
					</Link>
				)}
				<button type="button" onClick={() => setSharing(true)} className={buttonClass('primary')}>
					Share
				</button>
				{/* Figma "Attendees – more menu" */}
				<Menu
					label="More event options"
					buttonClassName="rounded-[10px] bg-light-blue p-3 transition-colors hover:bg-light-blue-hover"
					items={[
						...(canEdit ? [{ label: 'Import from Bevy', icon: upload, onSelect: () => setImporting({}) }] : []),
						{ label: 'Export for Bevy', icon: download, onSelect: () => exportAttendees(event) },
						{ label: 'Open prize draw', icon: gift, onSelect: () => window.open(`/events/${event.slug}/prize-draw`, '_blank') },
						...(canEdit ? [{ label: 'Delete event', icon: trash, separated: true, onSelect: () => setDeleting(true) }] : []),
					]}
				>
					<img src={ellipsis} alt="" width={18} height={18} />
				</Menu>
			</div>
			{deleting && <DeleteEventDialog event={event} onClose={() => setDeleting(false)} />}
			{sharing && <ShareDialog event={event} onClose={() => setSharing(false)} />}
			{importing && (
				<ImportDialog event={event} done={importing.done} onClose={() => setImporting(null)} onImported={(plan) => setImporting({ done: plan })} />
			)}
		</section>
	);
}

function CheckInLink({ url }: { url: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	return (
		<div className="flex items-center gap-[9px]">
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				className="truncate text-[15px] font-semibold tracking-tight text-med-blue underline"
			>
				{url.replace(/^https?:\/\//, '')}
			</a>
			<button
				type="button"
				aria-label="Copy check-in link"
				onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
				className="shrink-0 rounded p-0.5 hover:bg-light-blue/60"
			>
				<img src={clipboard} alt="" className="h-[20.6px] w-[12.9px]" />
			</button>
			{/* Not in the design: brief confirmation after copying */}
			<span role="status" className="text-xs text-med-blue">
				{copied ? 'Copied' : ''}
			</span>
		</div>
	);
}
