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
import { useIsDesktop } from '../lib/useMediaQuery';
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
	const checkIn = checkInStatus({ open: event.selfCheckInOpen, startsAt: event.startsAt });
	const status = statuses[checkIn];
	const [deleting, setDeleting] = useState(false);
	const canEdit = useCanEditEvents();
	const desktop = useIsDesktop();
	// Phones follow Figma's "Events (mobile)" sketch: the ring at 60% beside full-size text
	return (
		<article className="relative flex items-start justify-between gap-3 rounded-xl border border-med-blue bg-white py-5 pr-4 pl-5 hover:bg-off-white/60 md:items-center md:gap-6 md:rounded-[10px] md:px-[27px] md:py-6">
			<div className="flex min-w-0 items-start gap-4 md:items-center md:gap-7.5">
				<CheckInRing checkedIn={stats.checkedIn} total={stats.total} status={checkIn} scale={desktop ? 1 : 0.6} />
				<div className="flex min-w-0 flex-col items-start gap-2 pb-1.5 md:gap-[27px] md:pb-1">
					<div className="flex flex-col items-start gap-2 md:gap-1.5">
						<h2 className="font-display text-xl leading-[1.5] md:text-[27px] md:leading-normal">
							{/* Stretched link: the whole card opens the event, except the options button */}
							<Link to={`/events/${event.slug}`} className="after:absolute after:inset-0 after:rounded-xl md:after:rounded-[10px]">
								{event.name}
							</Link>
						</h2>
						<div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 md:gap-x-3.5">
							<p className="text-base leading-[1.5] font-medium tracking-tight text-black md:text-[15px] md:leading-normal">
								{formatDate(new Date(event.startsAt), event.timeZone)}
							</p>
							<p className={`flex items-center gap-1.5 text-base leading-[1.5] tracking-tight md:gap-1 md:text-xs md:leading-normal ${status.className}`}>
								<span aria-hidden="true" className="size-1.5 rounded-full bg-current md:size-[5px]" />
								{status.label}
							</p>
						</div>
					</div>
					<p className="text-base leading-[1.5] text-black md:text-[15px] md:leading-normal">{event.description}</p>
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
