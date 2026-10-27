import { formatDay } from '@checkpad/shared/format';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import chevron from '../assets/chevron-small.svg';
import { BarChart, StatTile, type Series } from '../components/Charts';
import PageHeader from '../components/PageHeader';
import { eventResult, eventsInRange, monthSpan, percent, ranges, returningShare } from '../lib/analytics';
import { useEvents } from '../lib/events';
import { useRosters } from '../lib/roster';
import { useTeams } from '../lib/teams';

const turnoutSeries: Series[] = [{ name: 'Turnout', className: 'bg-dark-blue' }];

// Figma "Analytics" (across events) at 75% scale.
export default function AnalyticsPage() {
	const events = useEvents();
	const teams = useTeams() ?? [];
	const [team, setTeam] = useState(teams[0]?.id ?? '');
	const [rangeId, setRangeId] = useState('6');
	const range = ranges.find((r) => r.id === rangeId)!;

	const included = useMemo(() => eventsInRange(events, team, range.months), [events, team, range]);
	const results = useMemo(() => included.map((e) => eventResult(e)), [included]);
	// Returning attendees needs every list of the team's past events, matched by email
	const teamEvents = useMemo(() => events.filter((e) => e.teamId === team && new Date(e.startsAt).getTime() < Date.now()), [events, team]);
	const rosters = useRosters(teamEvents);
	const registered = results.reduce((n, r) => n + r.registered, 0);
	const checkIns = results.reduce((n, r) => n + r.checkedIn, 0);
	const returning = useMemo(() => returningShare(included, teamEvents, rosters), [included, teamEvents, rosters]);

	// Label the best turnout and the latest event, not every bar
	const best = results.reduce<(typeof results)[number] | null>((b, r) => (!b || r.turnout > b.turnout ? r : b), null);
	const latest = results[results.length - 1];
	const top = Math.max(75, Math.ceil(Math.max(0, ...results.map((r) => r.turnout)) / 25) * 25);
	const ticks = Array.from({ length: top / 25 + 1 }, (_, i) => i * 25);
	const month = (r: (typeof results)[number]) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: r.event.timeZone }).format(new Date(r.event.startsAt));

	return (
		<>
			<PageHeader
				title="Analytics"
				actions={
					<div className="flex items-center gap-[9px]">
						<Filter label="Team" value={team} onChange={setTeam}>
							{teams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Filter>
						<Filter label="Time range" value={rangeId} onChange={setRangeId}>
							{ranges.map((r) => (
								<option key={r.id} value={r.id}>
									{r.label}
								</option>
							))}
						</Filter>
					</div>
				}
			/>
			<div className="flex flex-col gap-[21px] px-6 pt-[14px] pb-[27px]">
				<div className="flex gap-[15px]">
					<StatTile label="Events" value={String(included.length)} note={monthSpan(included)} />
					<StatTile label="Check-ins" value={String(checkIns)} note={`of ${registered} registered`} />
					<StatTile label="Average turnout" value={`${percent(checkIns, registered)}%`} note="checked in of registered" />
					<StatTile label="Returning" value={`${returning}%`} note="came to an earlier event" />
				</div>

				<section className="flex flex-col gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
					<div className="flex flex-col gap-[3px] leading-[1.5]">
						<h2 className="font-display text-lg">Turnout by event</h2>
						<p className="text-xs text-med-blue">Share of registered people who checked in</p>
					</div>
					{results.length ? (
						<BarChart
							label="Turnout by event"
							series={turnoutSeries}
							ticks={ticks}
							formatTick={(n) => `${n}%`}
							bars={results.map((r) => ({
								label: month(r),
								values: [r.turnout],
								title: r.event.name,
								lines: [`${r.checkedIn} of ${r.registered} checked in · ${r.turnout}%`],
								showValue: r === best || r === latest ? `${r.turnout}%` : undefined,
							}))}
						/>
					) : (
						<p className="py-6 text-center text-[13.5px] text-med-blue">No finished events in this range.</p>
					)}
				</section>

				{results.length > 0 && (
					<div className="rounded-xl border border-med-blue bg-white px-6 py-[15px]">
						<table className="w-full table-fixed text-[13.5px] leading-[1.5]">
							<colgroup>
								<col />
								<col className="w-[150px]" />
								<col className="w-[97.5px]" />
								<col className="w-[97.5px]" />
								<col className="w-[82.5px]" />
								<col className="w-[75px]" />
							</colgroup>
							<thead>
								<tr className="font-display text-black">
									<th className="pt-[3px] pb-[7.5px] text-left">Event</th>
									<th className="pt-[3px] pb-[7.5px] text-left">Date</th>
									<th className="pt-[3px] pb-[7.5px] text-right">Registered</th>
									<th className="pt-[3px] pb-[7.5px] text-right">Checked in</th>
									<th className="pt-[3px] pb-[7.5px] text-right">Turnout</th>
									<th className="pt-[3px] pb-[7.5px] text-right">Walk-ins</th>
								</tr>
							</thead>
							<tbody>
								{[...results].reverse().map((r) => (
									<tr key={r.event.slug} className="border-t border-light-blue text-black">
										<td className="truncate py-[9px] pr-3 font-bold text-dark-blue">
											<Link to={`/events/${r.event.slug}/analytics`} className="hover:underline">
												{r.event.name}
											</Link>
										</td>
										<td className="py-[9px]">{formatDay(new Date(r.event.startsAt), r.event.timeZone).replace(' ', ', ')}</td>
										<td className="py-[9px] text-right">{r.registered}</td>
										<td className="py-[9px] text-right">{r.checkedIn}</td>
										<td className="py-[9px] text-right">{r.turnout}%</td>
										<td className="py-[9px] text-right">{r.walkIns}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</>
	);
}

/** Figma "Filter": a bordered dropdown in the page header. */
function Filter({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
	return (
		<label className="relative">
			<span className="sr-only">{label}</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="appearance-none rounded-[9px] border border-med-blue bg-white py-[9px] pr-[34px] pl-[13.5px] text-[13.5px] leading-[1.5] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-med-blue"
			>
				{children}
			</select>
			<img src={chevron} alt="" width={13.5} height={13.5} className="pointer-events-none absolute top-1/2 right-[10.5px] -translate-y-1/2" />
		</label>
	);
}
