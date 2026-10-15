import { buttonClass } from '@checkpad/shared/button';
import EventCard from '../components/EventCard';
import PageHeader from '../components/PageHeader';
import { useEventSummaries } from '../lib/roster';

export default function EventsPage() {
	const summaries = useEventSummaries();
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
				{summaries.map((summary) => (
					<li key={summary.event.slug}>
						<EventCard summary={summary} />
					</li>
				))}
			</ul>
		</>
	);
}
