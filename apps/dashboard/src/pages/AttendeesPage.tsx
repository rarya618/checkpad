import { buttonClass } from '@checkpad/shared/button';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import close from '../assets/close.svg';
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
import { useEvent, type DashboardEvent } from '../lib/events';
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
								className="min-w-0 flex-1 bg-transparent text-[16.5px] tracking-tight outline-none placeholder:text-dark-blue/30"
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
						{stats.checkedIn === 0 && new Date(event.endsAt) > new Date() && <RehearsalNote event={event} canEdit={canEdit} />}
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

// Not in Figma: shown until the first check-in, so organisers try the attendee side before the
// night. Only organisers can remove a self walk-in (firestore.rules), so team members are told
// who to ask. Dismissing it is remembered on this device only.
function RehearsalNote({ event, canEdit }: { event: DashboardEvent; canEdit: boolean }) {
	const key = `rehearsal-dismissed:${event.id}`;
	const [dismissed, setDismissed] = useState(() => {
		try {
			return localStorage.getItem(key) === '1';
		} catch {
			return false;
		}
	});
	if (dismissed) return null;
	function dismiss() {
		setDismissed(true);
		try {
			localStorage.setItem(key, '1');
		} catch {
			// Storage blocked: it comes back next visit
		}
	}
	return (
		<aside aria-label="Try check-in" className="flex items-start gap-3 rounded-[9px] bg-light-blue py-[15px] pr-[15px] pl-[18px] leading-[1.5]">
			<div className="flex min-w-0 flex-1 flex-col gap-[4.5px]">
				<p className="text-[15px] font-bold">Try it before the night</p>
				<p className="text-[13.5px]">
					Scan the QR code from Share with your own phone and check in as someone on this list, then undo it in the table below so it
					doesn’t count.
					{canEdit
						? ' If you use an email that isn’t on the list, remove the walk-in it adds from its ⋮ menu.'
						: ' If you use an email that isn’t on the list, an organiser will need to remove the walk-in it adds.'}
					{!event.selfCheckInOpen &&
						(canEdit ? ' Self check-in is off for this event, so turn it on in Edit first.' : ' Self check-in is off for this event, so ask an organiser to turn it on first.')}
				</p>
			</div>
			<button type="button" aria-label="Dismiss" onClick={dismiss} className="shrink-0 rounded p-0.5 hover:bg-white/60">
				<img src={close} alt="" width={18} height={18} />
			</button>
		</aside>
	);
}
