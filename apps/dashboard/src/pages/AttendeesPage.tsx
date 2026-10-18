import { buttonClass } from '@checkpad/shared/button';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import magnifyingGlass from '../assets/magnifying-glass.svg';
import AttendeeTable from '../components/AttendeeTable';
import EventOverview from '../components/EventOverview';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';
import { useEvent } from '../lib/events';
import { rosterStats, useRoster } from '../lib/roster';

export default function AttendeesPage() {
	const { slug = '' } = useParams();
	// EventLayout has already redirected unknown slugs.
	const event = useEvent(slug)!;
	const roster = useRoster(slug);
	const stats = useMemo(() => rosterStats(roster), [roster]);
	const [query, setQuery] = useState('');

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return roster;
		return roster.filter((a) =>
			[`${a.firstName} ${a.lastName}`, a.email, a.ticket ?? ''].some((field) => field.toLowerCase().includes(q)),
		);
	}, [roster, query]);

	return (
		<>
			<EventOverview event={event} />
			<PageHeader
				level={2}
				title="Attendees"
				// 40.5px above (the gap below the event details); sticks with 24px left, like the page headers
				className="top-[-16.5px] pt-[40.5px] pb-[15px]"
				actions={
					<div className="flex items-center gap-[15px]">
						<label className="flex h-[42px] w-[230px] items-center gap-[15px] rounded-[10px] border border-dark-blue/32 px-[15px] focus-within:outline-2 focus-within:outline-med-blue">
							<img src={magnifyingGlass} alt="" width={15} height={15} />
							<span className="sr-only">Search attendees</span>
							<input
								type="search"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search attendee"
								className="min-w-0 flex-1 bg-transparent text-[16.5px] tracking-[-0.41px] outline-none placeholder:text-dark-blue/30"
							/>
						</label>
						{/* The add-attendee form isn't designed yet */}
						<button type="button" className={buttonClass('primary')}>
							Add attendee
						</button>
					</div>
				}
			/>
			<div className="flex flex-col gap-[15px] px-6 pb-[27px]">
				<StatsCard stats={stats} />
				<AttendeeTable eventSlug={slug} timeZone={event.timeZone} attendees={filtered} query={query.trim()} />
			</div>
		</>
	);
}
