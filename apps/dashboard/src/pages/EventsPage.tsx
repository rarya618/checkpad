import { buttonClass } from '@checkpad/shared/button';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { usePageArrival, useTransitionLink } from '../lib/pageTransition';
import calendar from '../assets/calendar.svg';
import magnifyingGlass from '../assets/magnifying-glass.svg';
import searchEmpty from '../assets/search-empty.svg';
import EmptyState from '../components/EmptyState';
import EventCard from '../components/EventCard';
import EventRow from '../components/EventRow';
import PageHeader from '../components/PageHeader';
import { eventPhase, groupOf, type EventGroup } from '../lib/eventPhase';
import { useEventSummaries, type EventSummary } from '../lib/events';
import { useCanEditEvents, useMe } from '../lib/organisers';
import { teamName, useTeams } from '../lib/teams';

/** A filter box appears once the list is longer than this. */
const FILTER_FROM = 8;
/** Past events shown before "Show all past events". */
const PAST_SHOWN = 3;

const sections: { group: EventGroup; title: string }[] = [
	{ group: 'now', title: 'Now' },
	{ group: 'upcoming', title: 'Upcoming' },
	{ group: 'past', title: 'Past' },
];

const byStart = (a: EventSummary, b: EventSummary) => a.event.startsAt.localeCompare(b.event.startsAt);

export default function EventsPage() {
	const summaries = useEventSummaries();
	const toNewEvent = useTransitionLink('/events/new');
	usePageArrival();
	const canEdit = useCanEditEvents();
	// Super admins see every team's events, so each card says whose it is. Team members can't read teams.
	const superAdmin = useMe().role === 'super-admin';
	const teams = useTeams(superAdmin);
	const [query, setQuery] = useState('');
	const [allPast, setAllPast] = useState(false);
	// The extra past rows clip while they open and close, and stop clipping once open, so
	// their menus can open past the list's edge
	const [pastSettled, setPastSettled] = useState(false);
	const pastSection = useRef<HTMLElement>(null);
	const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
	const togglePast = () => {
		const opening = !allPast;
		setAllPast(opening);
		setPastSettled(opening && reduceMotion());
		// Collapsing from far down the list: bring the Past heading back into view, so the
		// page doesn't strand the reader below a list that just got shorter
		const top = pastSection.current?.getBoundingClientRect().top ?? 0;
		if (!opening && top < 0) pastSection.current?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
	};

	const team = (summary: EventSummary) => (superAdmin ? (summary.event.ownerTeamId === null ? 'No team' : teamName(teams, summary.event.ownerTeamId)) : undefined);
	const needle = query.trim().toLowerCase();
	const matching = needle
		? summaries.filter((s) => s.event.name.toLowerCase().includes(needle) || team(s)?.toLowerCase().includes(needle))
		: summaries;

	// Now and Upcoming soonest first, Past most recent first. Events left open after they
	// ended go to the bottom of Now: they need closing, but tonight's event comes first.
	const grouped: Record<EventGroup, EventSummary[]> = { now: [], upcoming: [], past: [] };
	for (const summary of matching) grouped[groupOf(eventPhase(summary.event))].push(summary);
	const stale = (s: EventSummary) => (eventPhase(s.event) === 'stale-open' ? 1 : 0);
	grouped.now.sort((a, b) => stale(a) - stale(b) || byStart(a, b));
	grouped.upcoming.sort(byStart);
	grouped.past.sort((a, b) => byStart(b, a));
	// Collapse the past only when something else leads the page and there's a lot of it
	// Collapse the past only when something else leads the page and there's a lot of it
	const collapsible = !needle && grouped.past.length > PAST_SHOWN + 2 && grouped.now.length + grouped.upcoming.length > 0;

	return (
		<>
			<PageHeader
				title="Events"
				actionsRowOnPhones={summaries.length > FILTER_FROM}
				actions={
					(canEdit || summaries.length > FILTER_FROM) && (
						<div className="flex w-full items-center gap-4 md:w-auto">
							{summaries.length > FILTER_FROM && (
								<label className="flex h-[42px] min-w-0 flex-1 items-center gap-4 rounded-xl border border-dark-blue/32 px-4 focus-within:outline-2 focus-within:outline-med-blue md:w-[230px] md:flex-initial">
									<img src={magnifyingGlass} alt="" width={15} height={15} />
									<span className="sr-only">Filter events</span>
									<input
										type="search"
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										placeholder={superAdmin ? 'Event or team' : 'Event name'}
										className="min-w-0 flex-1 bg-transparent text-base tracking-tight outline-none placeholder:text-dark-blue/30"
									/>
								</label>
							)}
							{canEdit && (
								// Becomes New event's "Create event" button as that page opens (index.css)
								<Link to="/events/new" onClick={toNewEvent} style={{ viewTransitionName: 'primary-action' }} className={`${buttonClass('primary')} shrink-0`}>
									New event
								</Link>
							)}
						</div>
					)
				}
			/>
			{summaries.length === 0 ? (
				// Figma "Events – empty"
				<div className="px-6 pt-3.5 pb-7">
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
								<Link to="/events/new" onClick={toNewEvent} className={buttonClass('primary')}>
									New event
								</Link>
							)
						}
					/>
				</div>
			) : matching.length === 0 ? (
				<div className="px-6 pt-3.5 pb-7">
					<EmptyState
						compact
						icon={searchEmpty}
						title={`No events match “${query.trim()}”`}
						description={superAdmin ? 'Search by event or team name.' : 'Search by event name.'}
						actions={
							<button type="button" onClick={() => setQuery('')} className={buttonClass('secondary')}>
								Clear search
							</button>
						}
					/>
				</div>
			) : (
				<div className="flex flex-col gap-8 px-6 pt-3.5 pb-7">
					{sections.map(({ group, title }) => {
						const list = grouped[group];
						if (list.length === 0) return null;
						// Past keeps its extra rows in the list, folded away until "Show all"
						const folds = group === 'past' && collapsible;
						const shown = folds ? list.slice(0, PAST_SHOWN) : list;
						const extra = folds ? list.slice(PAST_SHOWN) : [];
						return (
							<section
								key={group}
								ref={group === 'past' ? pastSection : undefined}
								aria-labelledby={`events-${group}`}
								className="flex scroll-mt-24 flex-col gap-3"
							>
								<h2 id={`events-${group}`} className="font-display text-lg leading-normal">
									{title}
								</h2>
								{group === 'now' ? (
									<ul className="flex flex-col gap-3">
										{shown.map((summary) => (
											<li key={summary.event.slug}>
												<EventCard summary={summary} team={team(summary)} />
											</li>
										))}
									</ul>
								) : (
									// One list, scanned by date. Not overflow-hidden, so row menus can open past its edge.
									<ul className="divide-y divide-light-blue rounded-xl border border-line bg-white">
										{shown.map((summary, i) => (
											<li key={summary.event.slug}>
												<EventRow
													summary={summary}
													team={team(summary)}
													first={i === 0}
													last={i === shown.length - 1 && !(extra.length > 0 && allPast)}
												/>
											</li>
										))}
										{extra.length > 0 && (
											// Opens to the rows' height (index.css). Inert while folded, so its rows
											// can't be tabbed to; no divider of its own, its first row brings one.
											<li
												data-expander
												data-open={allPast || undefined}
												inert={!allPast}
												onTransitionEnd={(e) => {
													if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows') setPastSettled(allPast);
												}}
												className="border-t-0!"
											>
												<ul className={`divide-y divide-light-blue ${pastSettled && allPast ? '' : 'overflow-hidden'}`}>
													{extra.map((summary, i) => (
														<li key={summary.event.slug} className={i === 0 ? 'border-t border-light-blue' : ''}>
															<EventRow summary={summary} team={team(summary)} first={false} last={i === extra.length - 1} />
														</li>
													))}
												</ul>
											</li>
										)}
									</ul>
								)}
								{folds && (
									<button type="button" aria-expanded={allPast} onClick={togglePast} className={`${buttonClass('secondary')} self-start`}>
										{allPast ? 'Show fewer' : `Show all ${list.length} past events`}
									</button>
								)}
							</section>
						);
					})}
				</div>
			)}
		</>
	);
}
