import { buttonClass } from '@checkpad/shared/button';
import EventCard from '../components/EventCard';
import { eventSummaries } from '../lib/mock';

export default function EventsPage() {
	return (
		<div className="flex h-full flex-col gap-[21px] px-6 py-[27px]">
			<div className="flex items-center justify-between py-0.5">
				<h1 className="font-display text-3xl">Events</h1>
				{/* The create-event form isn't designed yet */}
				<button type="button" className={buttonClass('primary')}>
					New event
				</button>
			</div>
			<ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
				{eventSummaries.map((summary) => (
					<li key={summary.event.slug}>
						<EventCard summary={summary} />
					</li>
				))}
			</ul>
		</div>
	);
}
