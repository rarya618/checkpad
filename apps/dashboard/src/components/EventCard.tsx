import { checkInWindow, type CheckInWindow } from '@checkpad/shared/events';
import { formatDate } from '@checkpad/shared/format';
import ellipsis from '../assets/ellipsis-vertical.svg';
import type { EventSummary } from '../lib/mock';
import CheckInRing from './CheckInRing';

// Only "Closed" is in the Figma file; the other two are placeholders.
const statuses: Record<CheckInWindow, { label: string; className: string }> = {
	'not-open': { label: 'Upcoming', className: 'text-med-blue' },
	open: { label: 'Open', className: 'font-medium text-dark-blue' },
	closed: { label: 'Closed', className: 'text-med-blue' },
};

export default function EventCard({ summary }: { summary: EventSummary }) {
	const { event, checkedIn, total } = summary;
	const status = statuses[checkInWindow(event)];
	return (
		<article className="flex items-center justify-between gap-6 rounded-[10px] border border-med-blue bg-white px-[27px] py-6">
			<div className="flex min-w-0 items-center gap-7.5">
				<CheckInRing checkedIn={checkedIn} total={total} />
				<div className="flex min-w-0 flex-col items-start gap-[27px] pb-1">
					<div className="flex flex-col items-start gap-1.5">
						<h2 className="font-display text-[27px]">{event.name}</h2>
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
			{/* The event options menu isn't designed yet */}
			<button type="button" aria-label={`Options for ${event.name}`} className="shrink-0 rounded-md p-1 hover:bg-off-white">
				<img src={ellipsis} alt="" width={18} height={18} />
			</button>
		</article>
	);
}
