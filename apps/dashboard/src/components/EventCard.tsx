import { checkInStatus, type CheckInStatus } from '@checkpad/shared/events';
import { formatDate } from '@checkpad/shared/format';
import { useState } from 'react';
import { Link } from 'react-router';
import arrowRight from '../assets/arrow-right.svg';
import download from '../assets/download.svg';
import ellipsis from '../assets/ellipsis-vertical.svg';
import link from '../assets/link.svg';
import sliders from '../assets/sliders.svg';
import trash from '../assets/trash.svg';
import { exportAttendees } from '../lib/bevy';
import { checkInUrl } from '../lib/config';
import type { EventSummary } from '../lib/events';
import { useCanEditEvents } from '../lib/organisers';
import { showToast } from '../lib/toast';
import CheckInRing from './CheckInRing';
import DeleteEventDialog from './DeleteEventDialog';
import Menu from './Menu';

// Only "Closed" is in the Figma file; the other two are placeholders.
const statuses: Record<CheckInStatus, { label: string; className: string }> = {
	'not-open': { label: 'Upcoming', className: 'text-med-blue' },
	open: { label: 'Open', className: 'font-medium text-dark-blue' },
	closed: { label: 'Closed', className: 'text-med-blue' },
};

export default function EventCard({ summary }: { summary: EventSummary }) {
	const { event, stats } = summary;
	const status = statuses[checkInStatus({ open: event.selfCheckInOpen, startsAt: event.startsAt })];
	const [deleting, setDeleting] = useState(false);
	const canEdit = useCanEditEvents();
	return (
		<article className="relative flex items-center justify-between gap-6 rounded-[10px] border border-med-blue bg-white px-[27px] py-6 hover:bg-off-white/60">
			<div className="flex min-w-0 items-center gap-7.5">
				<CheckInRing checkedIn={stats.checkedIn} total={stats.total} />
				<div className="flex min-w-0 flex-col items-start gap-[27px] pb-1">
					<div className="flex flex-col items-start gap-1.5">
						<h2 className="font-display text-[27px]">
							{/* Stretched link: the whole card opens the event, except the options button */}
							<Link to={`/events/${event.slug}`} className="after:absolute after:inset-0 after:rounded-[10px]">
								{event.name}
							</Link>
						</h2>
						<div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
							<p className="text-[15px] font-medium tracking-[-0.375px] text-black">
								{formatDate(new Date(event.startsAt), event.timeZone)}
							</p>
							<p className={`flex items-center gap-1 text-xs tracking-[-0.3px] ${status.className}`}>
								<span aria-hidden="true" className="size-[5px] rounded-full bg-current" />
								{status.label}
							</p>
						</div>
					</div>
					<p className="text-[15px] text-black">{event.description}</p>
				</div>
			</div>
			{/* Figma "Events – card menu". relative lifts it above the card's stretched link. */}
			<div className="relative shrink-0">
				<Menu
					label={`Options for ${event.name}`}
					buttonClassName="rounded-md p-1 hover:bg-light-blue/60"
					items={[
						{ label: 'Open event', icon: arrowRight, to: `/events/${event.slug}` },
						...(canEdit ? [{ label: 'Settings', icon: sliders, to: `/events/${event.slug}/settings` }] : []),
						{
							label: 'Copy check-in link',
							icon: link,
							onSelect: () => navigator.clipboard.writeText(checkInUrl(event.slug)).then(() => showToast('Check-in link copied')),
						},
						{ label: 'Export for Bevy', icon: download, onSelect: () => exportAttendees(event) },
						...(canEdit ? [{ label: 'Delete event', icon: trash, separated: true, onSelect: () => setDeleting(true) }] : []),
					]}
				>
					<img src={ellipsis} alt="" width={18} height={18} />
				</Menu>
			</div>
			{deleting && <DeleteEventDialog event={event} onClose={() => setDeleting(false)} />}
		</article>
	);
}
