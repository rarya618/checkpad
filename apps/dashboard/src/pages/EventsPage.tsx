import { buttonClass } from '@checkpad/shared/button';
import { Link } from 'react-router';
import calendar from '../assets/calendar.svg';
import EmptyState from '../components/EmptyState';
import EventCard from '../components/EventCard';
import PageHeader from '../components/PageHeader';
import { useEventSummaries } from '../lib/events';
import { useCanEditEvents } from '../lib/organisers';

export default function EventsPage() {
	const summaries = useEventSummaries();
	const canEdit = useCanEditEvents();
	return (
		<>
			<PageHeader
				title="Events"
				actions={
					canEdit && (
						<Link to="/events/new" className={buttonClass('primary')}>
							New event
						</Link>
					)
				}
			/>
			{summaries.length === 0 ? (
				// Figma "Events – empty"
				<div className="px-6 pt-[14px] pb-[27px]">
					<EmptyState
						icon={calendar}
						title="No events yet"
						description={
							canEdit
								? 'Create your first event, then share its link or QR code so attendees can check themselves in.'
								: 'When your team’s organisers create an event, it shows up here.'
						}
						actions={
							canEdit && (
								<Link to="/events/new" className={buttonClass('primary')}>
									New event
								</Link>
							)
						}
					/>
				</div>
			) : (
				<ul className="flex flex-col gap-3 px-6 pt-[14px] pb-[27px]">
					{summaries.map((summary) => (
						<li key={summary.event.slug}>
							<EventCard summary={summary} />
						</li>
					))}
				</ul>
			)}
		</>
	);
}
