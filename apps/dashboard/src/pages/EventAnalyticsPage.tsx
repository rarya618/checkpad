import { buttonClass } from '@checkpad/shared/button';
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { AnswerRow, BarChart, ChartCard, CheckedInRow, LineChart, SplitBar, StatTile, type Series } from '../components/Charts';
import EventOverview from '../components/EventOverview';
import PageHeader from '../components/PageHeader';
import {
	arrivalBins,
	arrivalTiming,
	busiestBin,
	byTicketType,
	checkInMethods,
	comparableEvents,
	eventResult,
	firstCheckIns,
	formatDaysBefore,
	formatOffset,
	newVsReturning,
	niceTicks,
	percent,
	cameBack,
	laterEvents,
	registeredNewVsReturning,
	turnoutBySignUp,
	registrationQuestions,
	registrations,
	teamAverage,
	thinLabels,
	versusAverage,
} from '../lib/analytics';
import type { ImportPlan } from '../lib/attendeeImport';
import { useEvent, useEvents } from '../lib/events';
import { useCanEditEvents } from '../lib/organisers';
import { rosterStats, useRoster, useRosters } from '../lib/roster';

const series: Series[] = [
	{ name: 'Pre-registered', className: 'bg-dark-blue' },
	{ name: 'Walk-ins', className: 'bg-med-blue' },
];

// Loaded on first use, with the CSV library it brings
const ImportDialog = lazy(() => import('../components/ImportDialog'));

const registrationSeries: Series[] = [
	{ name: 'Checked in', className: 'bg-dark-blue' },
	{ name: 'Not checked in', className: 'bg-med-blue' },
];

// Figma "Event analytics" at 75% scale.
export default function EventAnalyticsPage() {
	const { slug = '' } = useParams();
	// EventLayout has already redirected unknown slugs.
	const event = useEvent(slug)!;
	const roster = useRoster(slug);
	const stats = useMemo(() => rosterStats(roster), [roster]);
	const bins = useMemo(() => arrivalBins(event, roster), [event, roster]);
	const busiest = busiestBin(bins);
	const types = useMemo(() => byTicketType(roster), [roster]);
	const walkInTickets = roster.filter((a) => a.walkIn && a.ticket).map((a) => a.ticket!).sort();
	const ticks = niceTicks(Math.max(1, ...bins.map((b) => b.preRegistered + b.walkIns)));
	const timing = useMemo(() => arrivalTiming(event, roster), [event, roster]);
	const methods = useMemo(() => checkInMethods(event, roster), [event, roster]);
	const signUps = useMemo(() => registrations(event, roster), [event, roster]);
	const signUpLabel = thinLabels(signUps.bins.length, 6);
	const registeredCount = roster.filter((a) => !a.walkIn).length;
	const canEdit = useCanEditEvents();
	const questions = useMemo(() => registrationQuestions(roster), [roster]);
	const chartedQuestions = questions.filter((q) => q.answers.length);
	const freeTextQuestions = questions.filter((q) => !q.answers.length);
	const [importing, setImporting] = useState<{ done?: ImportPlan } | null>(null);

	// First-timers need the earlier events of any of its teams, and the team average the owner team's
	const events = useEvents();
	const earlier = useMemo(
		() => events.filter((e) => e.teamIds.some((id) => event.teamIds.includes(id)) && e.startsAt < event.startsAt),
		[events, event.teamIds, event.startsAt],
	);
	const rosters = useRosters(earlier);
	const rostersLoaded = earlier.every((e) => e.id in rosters);
	const firstSeen = useMemo(() => firstCheckIns(earlier, rosters), [earlier, rosters]);
	const split = useMemo(() => newVsReturning(event, roster, firstSeen), [event, roster, firstSeen]);
	const registeredSplit = useMemo(() => registeredNewVsReturning(event, roster, firstSeen), [event, roster, firstSeen]);
	const average = useMemo(() => teamAverage(comparableEvents(events, event)), [events, event]);
	const result = eventResult(event);
	const started = new Date(event.startsAt).getTime() <= Date.now();
	const signUpTurnout = useMemo(() => turnoutBySignUp(event, roster).filter((g) => g.total), [event, roster]);
	// Came back: the team's next few events since, which need their lists too
	const later = useMemo(() => laterEvents(events, event), [events, event]);
	const laterRosters = useRosters(later);
	const laterLoaded = later.every((e) => e.id in laterRosters);
	const back = useMemo(() => cameBack(event, roster, firstSeen, later.map((e) => laterRosters[e.id] ?? [])), [event, roster, firstSeen, later, laterRosters]);

	return (
		<>
			<EventOverview event={event} />
			<PageHeader level={2} title="Analytics" className="top-0 pt-6 pb-4" />
			{/* Phones: everything one above the other */}
			<div className="flex flex-col gap-8 px-6 pb-7">
				<Section title="Turnout">
					<div className="flex flex-col gap-4 md:flex-row">
						{/* Checked in is pre-registered plus walk-ins, so they share a tile */}
						<StatTile
							label="Checked in"
							value={String(stats.checkedIn)}
							note={`${percent(stats.checkedIn, stats.total)}% of ${stats.total} on the list, walk-ins included`}
							compare={
								average
									? [`Turnout ${versusAverage(result.turnout, average.turnout, 'pts')}`, `Walk-ins: ${versusAverage(stats.walkIns, average.walkIns, 'people')}`]
									: undefined
							}
						>
							<SplitBar
								label="Checked in"
								parts={[
									{ name: 'Pre-registered', value: stats.preRegistered, className: 'bg-dark-blue', detail: `${stats.preRegistered} of ${registeredCount} registered` },
									{
										name: 'Walk-ins',
										value: stats.walkIns,
										className: 'bg-med-blue',
										detail: walkInTickets.length ? `${stats.walkIns} · ${walkInRange(walkInTickets)}` : 'None yet',
									},
								]}
							/>
						</StatTile>
						<ChartCard level={4} title="By ticket type" caption="Checked in of registered" className={SIDE}>
							{types.map((t) => (
								<CheckedInRow key={t.name} {...t} />
							))}
							<div className="flex items-start gap-1.5 leading-normal">
								<p className="min-w-0 flex-1 text-sm font-bold">Walk-in</p>
								<p className="shrink-0 text-xs text-med-blue">
									{stats.walkIns} {stats.walkIns === 1 ? 'person' : 'people'}
								</p>
							</div>
						</ChartCard>
					</div>
				</Section>

				<Section title="Registrations">
					<div className="flex flex-col gap-4 md:flex-row md:items-start">
						<ChartCard
							level={4}
							title="When people registered"
							caption={`Registered people per day, up to the event${signUps.bins.length && signUps.undated ? ` · ${signUps.undated} without a date` : ''}`}
							legend={signUps.bins.length ? registrationSeries : undefined}
							className="flex-1"
						>
							{signUps.bins.length ? (
								<>
									<dl className="grid grid-cols-3 gap-3 leading-normal">
										<Figure label="Middle registration" value={signUps.medianDaysBefore === null ? '–' : formatDaysBefore(signUps.medianDaysBefore)} />
										<Figure label="In the final week" value={`${signUps.finalWeek}%`} />
										<Figure label="On the day" value={`${signUps.onTheDay}%`} />
									</dl>
									<BarChart
										label="Registrations per day"
										series={registrationSeries}
										ticks={niceTicks(Math.max(1, ...signUps.bins.map((b) => b.checkedIn + b.notCheckedIn)))}
										bars={signUps.bins.map((b, i) => ({
											label: signUpLabel(i) ? b.label : '',
											values: [b.checkedIn, b.notCheckedIn],
											title: b.range,
											lines: [`${b.checkedIn} checked in`, `${b.notCheckedIn} not checked in`],
										}))}
									/>
								</>
							) : (
								<div className="flex flex-col items-start gap-3">
									<p className="text-xs text-med-blue">
										{!registeredCount
											? 'Nobody has registered yet.'
											: canEdit
												? 'No registration dates yet. Import the attendee CSV again to add them: Luma and Bevy exports include when each person registered.'
												: 'No registration dates yet. Your team’s organisers can add them by importing the attendee list again.'}
									</p>
									{canEdit && (
										<button type="button" onClick={() => setImporting({})} className={buttonClass('secondary')}>
											Import attendees
										</button>
									)}
								</div>
							)}
						</ChartCard>
						{signUps.bins.length > 0 && (
							<ChartCard level={4} title="Turnout by sign-up timing" caption="Checked in, by how early they registered" className={SIDE}>
								{started ? (
									signUpTurnout.map((g) => <CheckedInRow key={g.name} {...g} />)
								) : (
									<p className="text-xs text-med-blue">Shows once the event starts.</p>
								)}
							</ChartCard>
						)}
					</div>
				</Section>

				<Section title="Arrivals">
					<div className="flex flex-col gap-4 md:flex-row md:items-start">
						<ChartCard level={4} title="When people arrived" caption="Check-ins per 15 minutes" legend={series} className="flex-1">
							<BarChart
								label="Check-ins per 15 minutes"
								series={series}
								ticks={ticks}
								bars={bins.map((b, i) => ({
									label: i % 2 === 0 ? b.label : '',
									values: [b.preRegistered, b.walkIns],
									title: b.range,
									lines: [`${b.preRegistered} pre-registered`, `${b.walkIns} walk-in${b.walkIns === 1 ? '' : 's'}`],
									showValue: b === busiest ? String(b.preRegistered + b.walkIns) : undefined,
								}))}
							/>
						</ChartCard>
						<div className={`flex flex-col gap-4 ${SIDE}`}>
							<StatTile
								label="Busiest 15 minutes"
								value={busiest ? busiest.label : '–'}
								note={busiest ? `${busiest.preRegistered + busiest.walkIns} arrival${busiest.preRegistered + busiest.walkIns === 1 ? '' : 's'} from ${busiest.range.replace('–', ' to ')}` : 'No check-ins yet'}
							/>
							<ChartCard level={4} title="How people checked in" caption="On the attendee page or by an organiser">
								{methods ? (
									<>
										<SplitBar
											label="Check-in method"
											parts={[
												{ name: 'Self', value: methods.self, className: 'bg-dark-blue' },
												{ name: 'Organiser', value: methods.staff, className: 'bg-med-blue' },
											]}
										/>
										{methods.byOrganiser.length > 0 && (
											<ul className="flex flex-col gap-1.5 border-t border-light-blue pt-3 leading-normal">
												{methods.byOrganiser.map((o) => (
													<li key={o.email} className="flex items-start gap-1.5">
														<p className="min-w-0 flex-1 truncate text-sm" title={o.email}>
															{o.email}
														</p>
														<p className="shrink-0 text-xs text-med-blue">{o.count}</p>
													</li>
												))}
											</ul>
										)}
									</>
								) : (
									<p className="text-xs text-med-blue">Not recorded: this event came from the old check-in app.</p>
								)}
							</ChartCard>
						</div>
					</div>
					<ChartCard level={4} title="Arrival timing" caption="Running total of check-ins, from an hour before the start">
						<dl className="grid grid-cols-3 gap-3 leading-normal">
							<Figure label="Middle arrival" value={timing.medianMinutes === null ? '–' : formatOffset(timing.medianMinutes)} />
							<Figure label="By the start" value={`${timing.byStart}%`} />
							<Figure label="By 30 min after" value={`${timing.byHalfHour}%`} />
						</dl>
						<LineChart
							label="Running total of check-ins, per 15 minutes"
							ticks={niceTicks(Math.max(1, stats.checkedIn))}
							points={timing.cumulative.map((p, i) => ({
								// Each point is the total at the end of its 15 minutes
								label: i % 2 === 1 ? p.until : '',
								value: p.count,
								title: `By ${p.until}`,
								lines: [`${p.count} checked in · ${percent(p.count, stats.checkedIn)}% of arrivals`],
							}))}
						/>
					</ChartCard>
				</Section>

				<Section title="Audience">
					<div className="flex flex-col gap-4 md:flex-row md:items-start">
						<ChartCard level={4} className="flex-1" title="First-timers" caption={
								event.teamIds.length === 0 ? 'Not part of a team, so everyone is new' : event.teamIds.length === 1 ? 'First event with the team' : 'First event with any of its teams'
							}>
							{rostersLoaded ? (
								// Returning: came to an earlier event. Registered leaves out walk-ins; checked in counts them
								<div className="flex flex-col gap-3">
									{[
										{ heading: 'Registered', counts: registeredSplit },
										{ heading: 'Checked in', counts: split },
									].map(({ heading, counts }) => (
										<div key={heading} className="flex flex-col gap-1.5">
											<p className="text-xs leading-normal font-bold">{heading}</p>
											<SplitBar
												label={`${heading}: first-timers and returning`}
												parts={[
													{ name: 'First-timers', value: counts.firstTime, className: 'bg-med-blue' },
													{ name: 'Returning', value: counts.returning, className: 'bg-dark-blue' },
												]}
											/>
										</div>
									))}
								</div>
							) : (
								<p className="text-xs text-med-blue">Loading earlier events…</p>
							)}
						</ChartCard>
						<ChartCard
							level={4}
							className="flex-1"
							title="Came back"
							caption={
								later.length === 1
									? 'Checked in again at the team’s next event'
									: later.length
										? `Checked in again at one of the team’s next ${later.length} events`
										: 'Whether people who checked in came to a later event'
							}
						>
							{event.teamIds.length === 0 ? (
								<p className="text-xs text-med-blue">Not part of a team, so there are no later events to look at.</p>
							) : !later.length ? (
								<p className="text-xs text-med-blue">The team hasn’t had an event since this one.</p>
							) : rostersLoaded && laterLoaded ? (
								back.map((g) => <CheckedInRow key={g.name} {...g} />)
							) : (
								<p className="text-xs text-med-blue">Loading later events…</p>
							)}
						</ChartCard>
					</div>
					{/* The organiser's registration questions, from imports; nothing shows without them */}
					{chartedQuestions.map((q) => (
						<ChartCard key={q.question} level={4} title={q.question} caption={`${q.answered} answered`} legend={registrationSeries}>
							{q.answers.map((a) => (
								<AnswerRow key={a.name} {...a} answered={q.answered} />
							))}
						</ChartCard>
					))}
					{freeTextQuestions.length > 0 && (
						<ChartCard level={4} title="Free-text questions" caption="Too many different answers to chart. Export attendance (CSV) from the ⋮ menu to read them.">
							<ul className="flex flex-col gap-1.5 leading-normal">
								{freeTextQuestions.map((q) => (
									<li key={q.question} className="flex items-start gap-3">
										<p className="min-w-0 flex-1 text-sm">{q.question}</p>
										<p className="shrink-0 text-xs text-med-blue">{q.answered} answered</p>
									</li>
								))}
							</ul>
						</ChartCard>
					)}
				</Section>
			</div>
			{importing && (
				<Suspense fallback={null}>
					<ImportDialog event={event} done={importing.done} onClose={() => setImporting(null)} onImported={(plan) => setImporting({ done: plan })} />
				</Suspense>
			)}
		</>
	);
}

/** The side column's width: By ticket type, sign-up timing and the Arrivals side lining up. */
const SIDE = 'shrink-0 md:w-[285px]';

/** A headed group of cards: Turnout, Registrations, Arrivals, Audience. */
function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-4">
			<h3 className="font-display text-xl">{title}</h3>
			{children}
		</section>
	);
}

function Figure({ label, value }: { label: string; value: string }) {
	return (
		// Labels wrap on narrow screens; justify-between keeps the three values on one line
		<div className="flex min-w-0 flex-col justify-between">
			<dt className="text-xs text-med-blue">{label}</dt>
			<dd className="text-sm font-bold">{value}</dd>
		</div>
	);
}

/** "CPWALKIN0001–0004": the first ticket in full, then the last one's number. */
function walkInRange(tickets: string[]) {
	if (tickets.length === 1) return tickets[0];
	const last = tickets[tickets.length - 1];
	return `${tickets[0]}–${last.match(/\d+$/)?.[0] ?? last}`;
}
