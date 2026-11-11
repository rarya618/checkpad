import { useMemo } from 'react';
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
	formatOffset,
	newVsReturning,
	niceTicks,
	percent,
	teamAverage,
	versusAverage,
} from '../lib/analytics';
import { useEvent, useEvents } from '../lib/events';
import { rosterStats, useRoster, useRosters } from '../lib/roster';

const series: Series[] = [
	{ name: 'Pre-registered', className: 'bg-dark-blue' },
	{ name: 'Walk-ins', className: 'bg-med-blue' },
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

	// First-timers and the team average need the team's other events
	const events = useEvents();
	const earlier = useMemo(
		() => (event.teamId ? events.filter((e) => e.teamId === event.teamId && e.startsAt < event.startsAt) : []),
		[events, event.teamId, event.startsAt],
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
				{/* Phones: the tiles two by two, and the charts one above the other */}
				<div className="grid grid-cols-2 gap-4 md:flex">
					<StatTile
						label="Checked in"
						value={String(stats.checkedIn)}
						note={`${percent(stats.checkedIn, stats.total)}% of ${stats.total}`}
						compare={average ? `Turnout ${versusAverage(result.turnout, average.turnout, 'pts')}` : undefined}
					/>
					<StatTile label="Pre-registered" value={String(stats.preRegistered)} note={`of ${roster.filter((a) => !a.walkIn).length} registered`} />
					<StatTile
						label="Walk-ins"
						value={String(stats.walkIns)}
						note={walkInTickets.length ? walkInRange(walkInTickets) : 'None yet'}
						compare={average ? versusAverage(stats.walkIns, average.walkIns, 'people') : undefined}
					/>
					<StatTile
						label="Busiest 15 minutes"
						value={busiest ? busiest.label : '–'}
						note={busiest ? `${busiest.preRegistered + busiest.walkIns} arrivals` : 'No check-ins yet'}
					/>
				</div>
				<div className="flex flex-col gap-4 md:flex-row md:items-start">
					<section className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-med-blue bg-white px-6 py-5">
						<div className="flex items-start gap-3">
							<div className="flex min-w-0 flex-1 flex-col gap-1 leading-normal">
								<h3 className="font-display text-lg">Arrivals</h3>
								<p className="text-xs text-med-blue">Check-ins every 15 minutes</p>
							</div>
							<Legend series={series} />
						</div>
						<BarChart
							label="Check-ins every 15 minutes"
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
							<div key={t.name} className="flex flex-col gap-1.5">
								<div className="flex items-start gap-1.5 leading-normal">
									<p className="min-w-0 flex-1 truncate text-sm font-bold">{t.name}</p>
									<p className="shrink-0 text-xs text-med-blue">
										{t.checkedIn} of {t.total} · {percent(t.checkedIn, t.total)}%
									</p>
								</div>
								<div className="h-[7.5px] overflow-hidden rounded-full bg-light-blue" role="presentation">
									<div className="h-full bg-dark-blue" style={{ width: `${percent(t.checkedIn, t.total)}%` }} />
								</div>
							</div>
						))}
						<div className="flex items-start gap-1.5 leading-normal">
							<p className="min-w-0 flex-1 text-sm font-bold">Walk-in</p>
							<p className="shrink-0 text-xs text-med-blue">
								{stats.walkIns} {stats.walkIns === 1 ? 'person' : 'people'}
							</p>
						</div>
					</section>
				</div>
				<div className="flex flex-col gap-4 md:flex-row md:items-start">
					<ChartCard title="Arrival timing" caption="Running total of check-ins, from an hour before the start" className="flex-1">
						<dl className="grid grid-cols-3 gap-3 leading-normal">
							<Figure label="Middle arrival" value={timing.medianMinutes === null ? '–' : formatOffset(timing.medianMinutes)} />
							<Figure label="By the start" value={`${timing.byStart}%`} />
							<Figure label="Within 30 minutes" value={`${timing.byHalfHour}%`} />
						</dl>
						<LineChart
							label="Check-ins so far, every 15 minutes"
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
						<ChartCard title="First-timers" caption={event.teamId ? 'First event with the team' : 'Not part of a team, so everyone is new'}>
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
		</>
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

/** "GDGWALKIN0001–0004": the first ticket in full, then the last one's number. */
function walkInRange(tickets: string[]) {
	if (tickets.length === 1) return tickets[0];
	const last = tickets[tickets.length - 1];
	return `${tickets[0]}–${last.match(/\d+$/)?.[0] ?? last}`;
}
