import { buttonClass } from '@checkpad/shared/button';
import EventCard from '../components/EventCard';
import PageHeader from '../components/PageHeader';
import { eventSummaries } from '../lib/mock';

export default function EventsPage() {
	return (
		<>
			<PageHeader
				title="Events"
				actions={
					// The create-event form isn't designed yet
					<button type="button" className={buttonClass('primary')}>
						New event
					</button>
				}
			/>
			<ul className="flex flex-col gap-3 px-6 pb-[27px]">
				{eventSummaries.map((summary) => (
					<li key={summary.event.slug}>
						<EventCard summary={summary} />
					</li>
				))}
			</ul>
		</>
	);
}
