import { buttonClass } from '@checkpad/shared/button';
import { Link } from 'react-router';
import EventCard from '../components/EventCard';
import PageHeader from '../components/PageHeader';
import { useEventSummaries } from '../lib/events';

export default function EventsPage() {
	const summaries = useEventSummaries();
	return (
		<>
			<PageHeader
				title="Events"
				actions={
					<Link to="/events/new" className={buttonClass('primary')}>
						New event
					</Link>
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
