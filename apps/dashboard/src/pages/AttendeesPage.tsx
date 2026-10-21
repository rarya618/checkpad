import { buttonClass } from '@checkpad/shared/button';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import magnifyingGlass from '../assets/magnifying-glass.svg';
import searchEmpty from '../assets/search-empty.svg';
import users from '../assets/users.svg';
import AttendeeTable from '../components/AttendeeTable';
import EmptyState from '../components/EmptyState';
import EventOverview from '../components/EventOverview';
import ImportDialog from '../components/ImportDialog';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';
import { WalkInDialog } from '../components/WalkIn';
import type { ImportPlan } from '../lib/bevy';
import { useEvent } from '../lib/events';
import { useCanEditEvents } from '../lib/organisers';
import { rosterStats, useRoster } from '../lib/roster';

export default function AttendeesPage() {
	const { slug = '' } = useParams();
	// EventLayout has already redirected unknown slugs.
	const event = useEvent(slug)!;
	const roster = useRoster(slug);
	const stats = useMemo(() => rosterStats(roster), [roster]);
	const [query, setQuery] = useState('');
	// The walk-in dialog, prefilled with the search when it came from "no search results"
	const [walkIn, setWalkIn] = useState<string | null>(null);
	const [importing, setImporting] = useState<{ done?: ImportPlan } | null>(null);
	const canEdit = useCanEditEvents();

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
						{/* Figma "Attendees – add walk-in" */}
						<button type="button" onClick={() => setWalkIn('')} className={buttonClass('primary')}>
							Add attendee
						</button>
					</div>
				}
			/>
			<div className="flex flex-col gap-[15px] px-6 pb-[27px]">
				{roster.length === 0 ? (
					// Figma "Attendees – empty"
					<EmptyState
						icon={users}
						title="No attendees yet"
						description={
							canEdit
								? 'Import the attendee list from Bevy, or add walk-ins as people arrive.'
								: 'Add walk-ins as people arrive. Your team’s organisers import the attendee list from Bevy.'
						}
						actions={
							<>
								<button type="button" onClick={() => setWalkIn('')} className={buttonClass(canEdit ? 'secondary' : 'primary')}>
									Add walk-in
								</button>
								{canEdit && (
									<button type="button" onClick={() => setImporting({})} className={buttonClass('primary')}>
										Import from Bevy
									</button>
								)}
							</>
						}
					/>
				) : (
					<>
						<StatsCard stats={stats} />
						{filtered.length === 0 ? (
							// Figma "Attendees – no search results"
							<EmptyState
								compact
								icon={searchEmpty}
								title={`No one matches “${query.trim()}”`}
								description="Search by first name, last name, email or ticket number."
								actions={
									<>
										<button type="button" onClick={() => setQuery('')} className={buttonClass('secondary')}>
											Clear search
										</button>
										<button type="button" onClick={() => setWalkIn(query.trim())} className={buttonClass('primary')}>
											Add as walk-in
										</button>
									</>
								}
							/>
						) : (
							<AttendeeTable event={event} attendees={filtered} />
						)}
					</>
				)}
			</div>
			{walkIn !== null && <WalkInDialog event={event} prefill={walkIn} onClose={() => setWalkIn(null)} />}
			{importing && (
				<ImportDialog event={event} done={importing.done} onClose={() => setImporting(null)} onImported={(plan) => setImporting({ done: plan })} />
			)}
		</>
	);
}
