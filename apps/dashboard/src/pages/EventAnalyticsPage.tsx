import { buttonClass } from '@checkpad/shared/button';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { BarChart, ChartCard, Legend, LineChart, SplitBar, StatTile, type Series } from '../components/Charts';
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
	const split = useMemo(() => newVsReturning(event, roster, firstCheckIns(earlier, rosters)), [event, roster, earlier, rosters]);
	const average = useMemo(() => teamAverage(comparableEvents(events, event)), [events, event]);
	const result = eventResult(event);

	return (
		<>
			<EventOverview event={event} />
			<PageHeader level={2} title="Analytics" className="top-0 pt-6 pb-4" />
			<div className="flex flex-col gap-4 px-6 pb-7">
				{/* Phones: the tiles and charts one above the other */}
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
					{/* As wide as By ticket type below, so the columns line up */}
					<StatTile
						className="md:w-[285px] md:flex-none"
						label="Busiest 15 minutes"
						value={busiest ? busiest.label : '–'}
						note={busiest ? `${busiest.preRegistered + busiest.walkIns} arrivals from ${busiest.range.replace('–', ' to ')}` : 'No check-ins yet'}
					/>
				</div>
				<div className="flex flex-col gap-4 md:flex-row md:items-start">
					<section className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-med-blue bg-white px-6 py-5">
						<div className="flex items-start gap-3">
							<div className="flex min-w-0 flex-1 flex-col gap-1 leading-normal">
								<h3 className="font-display text-lg">Arrivals</h3>
								<p className="text-xs text-med-blue">Check-ins per 15 minutes</p>
							</div>
							<Legend series={series} />
						</div>
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
					</section>
					<section className="flex shrink-0 flex-col md:w-[285px] gap-4 rounded-xl border border-med-blue bg-white px-6 py-5">
						<div className="flex flex-col gap-1 leading-normal">
							<h3 className="font-display text-lg">By ticket type</h3>
							<p className="text-xs text-med-blue">Checked in of registered</p>
						</div>
						{types.map((t) => (
							<CheckedInRow key={t.name} {...t} />
						))}
						<div className="flex items-start gap-1.5 leading-normal">
							<p className="min-w-0 flex-1 text-sm font-bold">Walk-in</p>
							<p className="shrink-0 text-xs text-med-blue">
								{stats.walkIns} {stats.walkIns === 1 ? 'person' : 'people'}
							</p>
						</div>
					</section>
				</div>
				<ChartCard
					title="Registrations"
					caption={`Registered people per day, up to the event${
						signUps.bins.length && signUps.undated ? ` · ${signUps.undated} without a date` : ''
					}`}
					legend={signUps.bins.length ? registrationSeries : undefined}
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
				{/* The organiser's registration questions, from imports; nothing shows without them */}
				{chartedQuestions.length > 0 && (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{chartedQuestions.map((q) => (
							<ChartCard key={q.question} title={q.question} caption={`${q.answered} answered · checked in of each answer`}>
								{q.answers.map((a) => (
									<CheckedInRow key={a.name} {...a} />
								))}
							</ChartCard>
						))}
					</div>
				)}
				{freeTextQuestions.length > 0 && (
					<ChartCard title="Free-text questions" caption="Too many different answers to chart. Export attendance (CSV) from the ⋮ menu to read them.">
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
				<div className="flex flex-col gap-4 md:flex-row md:items-start">
					<ChartCard title="Arrival timing" caption="Running total of check-ins, from an hour before the start" className="flex-1">
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
					<div className="flex shrink-0 flex-col gap-4 md:w-[285px]">
						<ChartCard title="First-timers" caption={
								event.teamIds.length === 0 ? 'Not part of a team, so everyone is new' : event.teamIds.length === 1 ? 'First event with the team' : 'First event with any of its teams'
							}>
							{rostersLoaded ? (
								<SplitBar
									label="First-timers and returning"
									parts={[
										{ name: 'First-timers', value: split.firstTime, className: 'bg-med-blue' },
										{ name: 'Returning', value: split.returning, className: 'bg-dark-blue' },
									]}
								/>
							) : (
								<p className="text-xs text-med-blue">Loading earlier events…</p>
							)}
						</ChartCard>
						<ChartCard title="How people checked in" caption="On the attendee page or by an organiser">
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
			</div>
			{importing && (
				<Suspense fallback={null}>
					<ImportDialog event={event} done={importing.done} onClose={() => setImporting(null)} onImported={(plan) => setImporting({ done: plan })} />
				</Suspense>
			)}
		</>
	);
}

/** One group's check-ins of its total, as a bar: a ticket type or an answer to a question. */
function CheckedInRow({ name, checkedIn, total }: { name: string; checkedIn: number; total: number }) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-start gap-1.5 leading-normal">
				<p className="min-w-0 flex-1 truncate text-sm font-bold" title={name}>
					{name}
				</p>
				<p className="shrink-0 text-xs text-med-blue">
					{checkedIn} of {total} · {percent(checkedIn, total)}%
				</p>
			</div>
			<div className="h-[7.5px] overflow-hidden rounded-full bg-light-blue" role="presentation">
				<div className="h-full bg-dark-blue" style={{ width: `${percent(checkedIn, total)}%` }} />
			</div>
		</div>
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
