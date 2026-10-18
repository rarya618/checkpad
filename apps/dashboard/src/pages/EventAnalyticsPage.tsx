import { useMemo } from 'react';
import { useParams } from 'react-router';
import { BarChart, Legend, StatTile, type Series } from '../components/Charts';
import EventOverview from '../components/EventOverview';
import PageHeader from '../components/PageHeader';
import { arrivalBins, busiestBin, byTicketType, niceTicks, percent } from '../lib/analytics';
import { useEvent } from '../lib/events';
import { rosterStats, useRoster } from '../lib/roster';

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

	return (
		<>
			<EventOverview event={event} />
			<PageHeader level={2} title="Analytics" className="top-0 pt-6 pb-[15px]" />
			<div className="flex flex-col gap-[15px] px-6 pb-[27px]">
				<div className="flex gap-[15px]">
					<StatTile label="Checked in" value={String(stats.checkedIn)} note={`${percent(stats.checkedIn, stats.total)}% of ${stats.total}`} />
					<StatTile label="Pre-registered" value={String(stats.preRegistered)} note={`of ${roster.filter((a) => !a.walkIn).length} from Bevy`} />
					<StatTile
						label="Walk-ins"
						value={String(stats.walkIns)}
						note={walkInTickets.length ? walkInRange(walkInTickets) : 'None yet'}
					/>
					<StatTile
						label="Busiest 15 minutes"
						value={busiest ? busiest.label : '–'}
						note={busiest ? `${busiest.preRegistered + busiest.walkIns} arrivals` : 'No check-ins yet'}
					/>
				</div>
				<div className="flex items-start gap-[15px]">
					<section className="flex min-w-0 flex-1 flex-col gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
						<div className="flex items-start gap-3">
							<div className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[1.5]">
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
					<section className="flex w-[285px] shrink-0 flex-col gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
						<div className="flex flex-col gap-[3px] leading-[1.5]">
							<h3 className="font-display text-lg">By ticket type</h3>
							<p className="text-xs text-med-blue">Checked in of registered</p>
						</div>
						{types.map((t) => (
							<div key={t.name} className="flex flex-col gap-1.5">
								<div className="flex items-start gap-1.5 leading-[1.5]">
									<p className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{t.name}</p>
									<p className="shrink-0 text-xs text-med-blue">
										{t.checkedIn} of {t.total} · {percent(t.checkedIn, t.total)}%
									</p>
								</div>
								<div className="h-[7.5px] overflow-hidden rounded-full bg-light-blue" role="presentation">
									<div className="h-full bg-dark-blue" style={{ width: `${percent(t.checkedIn, t.total)}%` }} />
								</div>
							</div>
						))}
						<div className="flex items-start gap-1.5 leading-[1.5]">
							<p className="min-w-0 flex-1 text-[13.5px] font-bold">Walk-in</p>
							<p className="shrink-0 text-xs text-med-blue">
								{stats.walkIns} {stats.walkIns === 1 ? 'person' : 'people'}
							</p>
						</div>
					</section>
				</div>
			</div>
		</>
	);
}

/** "GDGWALKIN0001–0004": the first ticket in full, then the last one's number. */
function walkInRange(tickets: string[]) {
	if (tickets.length === 1) return tickets[0];
	const last = tickets[tickets.length - 1];
	return `${tickets[0]}–${last.match(/\d+$/)?.[0] ?? last}`;
}
