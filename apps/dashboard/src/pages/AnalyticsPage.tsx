import { formatDay } from '@checkpad/shared/format';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import chevron from '../assets/chevron-small.svg';
import { AnswerRow, BarChart, ChartCard, CheckedInRow, StatTile, type Series } from '../components/Charts';
import PageHeader from '../components/PageHeader';
import {
	byTicketType,
	checkInMethods,
	formatDaysBefore,
	eventResult,
	eventsInRange,
	firstCheckIns,
	monthSpan,
	newVsReturning,
	niceTicks,
	people,
	percent,
	ranges,
	registrationQuestions,
	registrations,
	regulars,
	repeatNoShows,
	returningShare,
	sumRows,
	thinLabels,
	turnoutBySignUp,
	turnoutVersus,
	versusAverage,
	type EventResult,
	type Person,
} from '../lib/analytics';
import { useEvents } from '../lib/events';
import { useRosters } from '../lib/roster';
import { useTeams } from '../lib/teams';
import { useMediaQuery } from '../lib/useMediaQuery';

const turnoutSeries: Series[] = [{ name: 'Turnout', className: 'bg-dark-blue' }];
// Didn't come is hollow, so it reads by shape as well as colour
const attendanceSeries: Series[] = [
	{ name: 'Pre-registered', className: 'bg-dark-blue' },
	{ name: 'Walk-ins', className: 'bg-med-blue' },
	{ name: "Didn't come", className: 'border border-med-blue bg-white' },
];
const returningSeries: Series[] = [
	{ name: 'Returning', className: 'bg-dark-blue' },
	{ name: 'First-timers', className: 'bg-med-blue' },
];
const methodSeries: Series[] = [
	{ name: 'Self', className: 'bg-dark-blue' },
	{ name: 'Organiser', className: 'bg-med-blue' },
];
const signUpSeries: Series[] = [{ name: 'Middle registration', className: 'bg-dark-blue' }];
const answerSeries: Series[] = [
	{ name: 'Checked in', className: 'bg-dark-blue' },
	{ name: 'Not checked in', className: 'bg-med-blue' },
];
const LIST_LENGTH = 8;

// Figma "Analytics" (across events) at 75% scale. Phones get the tiles two by two, and a
// table of just the event (with its date) and turnout.
export default function AnalyticsPage() {
	const events = useEvents();
	const teams = useTeams() ?? [];
	const [team, setTeam] = useState(teams[0]?.id ?? '');
	const [rangeId, setRangeId] = useState('6');
	const range = ranges.find((r) => r.id === rangeId)!;

	const included = useMemo(() => eventsInRange(events, team, range.months), [events, team, range]);
	const results = useMemo(() => included.map((e) => eventResult(e)), [included]);
	// Returning attendees needs every list of the team's past events, matched by email
	const teamEvents = useMemo(() => events.filter((e) => e.teamIds.includes(team) && new Date(e.startsAt).getTime() < Date.now()), [events, team]);
	const rosters = useRosters(teamEvents);
	const onList = results.reduce((n, r) => n + r.registered, 0);
	const checkIns = results.reduce((n, r) => n + r.checkedIn, 0);
	const loaded = teamEvents.every((e) => e.id in rosters);
	const returning = useMemo(() => returningShare(included, teamEvents, rosters), [included, teamEvents, rosters]);
	const walkIns = results.reduce((n, r) => n + r.walkIns, 0);

	// Per event: first-timers and returning, and how people checked in (null for migrated events)
	const detail = useMemo(() => {
		const firstSeen = firstCheckIns(teamEvents, rosters);
		return included.map((e) => ({ split: newVsReturning(e, rosters[e.id] ?? [], firstSeen), methods: checkInMethods(e, rosters[e.id] ?? []) }));
	}, [included, teamEvents, rosters]);
	const recorded = detail.filter((d) => d.methods);
	const selfCheckIns = recorded.reduce((n, d) => n + d.methods!.self, 0);
	const recordedCheckIns = recorded.reduce((n, d) => n + d.methods!.self + d.methods!.staff, 0);
	const everyone = useMemo(() => people(included, rosters), [included, rosters]);
	const regularList = useMemo(() => regulars(everyone), [everyone]);
	const noShowList = useMemo(() => repeatNoShows(everyone), [everyone]);

	// Registrations and audience, event by event and added up across them
	const signUps = useMemo(() => included.map((e) => registrations(e, rosters[e.id] ?? [])), [included, rosters]);
	const anyDates = signUps.some((s) => s.medianDaysBefore !== null);
	const signUpTurnout = useMemo(() => sumRows(included.map((e) => turnoutBySignUp(e, rosters[e.id] ?? []))).filter((g) => g.total), [included, rosters]);
	const ticketTypes = useMemo(() => sumRows(included.map((e) => byTicketType(rosters[e.id] ?? []))).sort((a, b) => b.total - a.total), [included, rosters]);
	// Questions asked at two or more of the events, their answers added up
	const repeatedQuestions = useMemo(() => {
		const asked = new Map<string, Set<string>>();
		for (const e of included) for (const a of rosters[e.id] ?? []) for (const q of Object.keys(a.answers ?? {})) asked.set(q, (asked.get(q) ?? new Set()).add(e.id));
		return registrationQuestions(included.flatMap((e) => rosters[e.id] ?? []))
			.filter((q) => q.answers.length && (asked.get(q.question)?.size ?? 0) >= 2)
			.map((q) => ({ ...q, events: asked.get(q.question)!.size }));
	}, [included, rosters]);

	// Label the best turnout and the latest event, not every bar
	const best = results.reduce<(typeof results)[number] | null>((b, r) => (!b || r.turnout > b.turnout ? r : b), null);
	const latest = results[results.length - 1];
	const top = Math.max(75, Math.ceil(Math.max(0, ...results.map((r) => r.turnout)) / 25) * 25);
	const ticks = Array.from({ length: top / 25 + 1 }, (_, i) => i * 25);
	// The table's full columns take about 500px, so they wait for a wide window: from 1152px the
	// event names keep about 270px beside the sidebar. Narrower, date and counts go under the name.
	const wide = useMediaQuery('(min-width: 1152px)');
	const date = (r: (typeof results)[number]) => formatDay(new Date(r.event.startsAt), r.event.timeZone).replace(' ', ', ');
	const month = (r: (typeof results)[number]) => new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: r.event.timeZone }).format(new Date(r.event.startsAt));
	const showLabel = thinLabels(results.length);
	const axisLabel = (r: (typeof results)[number], i: number) => (showLabel(i) ? month(r) : '');

	return (
		<>
			<PageHeader
				actionsRowOnPhones
				title="Analytics"
				actions={
					<div className="flex items-center gap-2.5 max-md:w-full max-md:*:flex-1">
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
			<div className="flex flex-col gap-5 px-6 pt-3.5 pb-7">
				{latest && <LatestEvent latest={latest} others={results.slice(0, -1)} date={date(latest)} />}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
					<StatTile label="Events" value={String(included.length)} note={monthSpan(included)} />
					<StatTile label="Check-ins" value={String(checkIns)} note={`of ${onList} on the list`} />
					<StatTile label="Turnout" value={`${percent(checkIns, onList)}%`} note="of everyone on the list" />
					<StatTile label="Returning" value={loaded ? `${returning}%` : '–'} note="came to an earlier event" />
					<StatTile label="Walk-ins" value={`${percent(walkIns, checkIns)}%`} note={`${walkIns} of check-ins`} />
					<StatTile
						label="Self check-in"
						value={!loaded ? '–' : recordedCheckIns ? `${percent(selfCheckIns, recordedCheckIns)}%` : '–'}
						note={recorded.length < included.length ? 'not recorded for older events' : 'on the attendee page'}
					/>
				</div>

				{results.length ? (
					<div className="grid gap-4 xl:grid-cols-2">
						<ChartCard level={2} title="Turnout by event" caption="Share of everyone on the list who checked in, walk-ins included">
							<BarChart
								label="Turnout by event"
								series={turnoutSeries}
								ticks={ticks}
								formatTick={(n) => `${n}%`}
								bars={results.map((r, i) => ({
									label: axisLabel(r, i),
									values: [r.turnout],
									title: r.event.name,
									lines: [`${r.checkedIn} of ${r.registered} checked in · ${r.turnout}%`],
									showValue: r === best || r === latest ? `${r.turnout}%` : undefined,
								}))}
							/>
						</ChartCard>
						<ChartCard level={2} title="Attendance by event" caption="Everyone on the list, by whether they came" legend={attendanceSeries}>
							<BarChart
								label="Attendance by event"
								series={attendanceSeries}
								ticks={niceTicks(Math.max(1, ...results.map((r) => r.registered)))}
								bars={results.map((r, i) => ({
									label: axisLabel(r, i),
									values: [r.checkedIn - r.walkIns, r.walkIns, r.registered - r.checkedIn],
									title: r.event.name,
									lines: [
										`${r.checkedIn - r.walkIns} pre-registered`,
										`${r.walkIns} walk-ins · ${percent(r.walkIns, r.checkedIn)}% of check-ins`,
										`${r.registered - r.checkedIn} didn't come`,
									],
									showValue: r === latest ? String(r.checkedIn) : undefined,
								}))}
							/>
						</ChartCard>
						<ChartCard level={2} title="New and returning" caption="Check-ins by whether they came to an earlier event" legend={returningSeries}>
							{loaded ? (
								<BarChart
									label="New and returning by event"
									series={returningSeries}
									ticks={niceTicks(Math.max(1, ...detail.map((d) => d.split.returning + d.split.firstTime)))}
									bars={results.map((r, i) => {
										const { returning, firstTime } = detail[i].split;
										return {
											label: axisLabel(r, i),
											values: [returning, firstTime],
											title: r.event.name,
											lines: [`${returning} returning`, `${firstTime} first-timers · ${percent(firstTime, returning + firstTime)}%`],
										};
									})}
								/>
							) : (
								<Loading />
							)}
						</ChartCard>
						<ChartCard level={2} title="How people checked in" caption="On the attendee page or by an organiser" legend={methodSeries}>
							{loaded ? (
								<BarChart
									label="Check-in method by event"
									series={methodSeries}
									ticks={niceTicks(Math.max(1, ...detail.map((d) => (d.methods ? d.methods.self + d.methods.staff : 0))))}
									bars={results.map((r, i) => {
										const m = detail[i].methods;
										return {
											label: axisLabel(r, i),
											values: m ? [m.self, m.staff] : [0, 0],
											title: r.event.name,
											lines: m ? [`${m.self} self · ${percent(m.self, m.self + m.staff)}%`, `${m.staff} by an organiser`] : ['Not recorded in the old check-in app'],
										};
									})}
								/>
							) : (
								<Loading />
							)}
						</ChartCard>
					</div>
				) : (
					<ChartCard level={2} title="Turnout by event" caption="Share of everyone on the list who checked in, walk-ins included">
						<p className="py-6 text-center text-sm text-med-blue">No finished events in this range.</p>
					</ChartCard>
				)}

				{results.length > 0 && (
					<div className="grid gap-4 xl:grid-cols-2">
						<ChartCard level={2} title="How early people register" caption="Middle registration, days before each event" legend={signUpSeries}>
							{!loaded ? (
								<Loading />
							) : anyDates ? (
								<BarChart
									label="Middle registration by event"
									series={signUpSeries}
									ticks={niceTicks(Math.max(1, ...signUps.map((s) => s.medianDaysBefore ?? 0)))}
									bars={results.map((r, i) => {
										const s = signUps[i];
										return {
											label: axisLabel(r, i),
											values: [s.medianDaysBefore ?? 0],
											title: r.event.name,
											lines:
												s.medianDaysBefore === null
													? ['No registration dates: import the list again to add them']
													: [`Middle registration ${formatDaysBefore(s.medianDaysBefore).toLowerCase()}`, `${s.finalWeek}% in the final week · ${s.onTheDay}% on the day`],
										};
									})}
								/>
							) : (
								<p className="text-sm text-med-blue">No registration dates yet. Import each event’s attendee list again to add them.</p>
							)}
						</ChartCard>
						<ChartCard level={2} title="Turnout by sign-up timing" caption="Checked in across these events, by how early they registered">
							{!loaded ? <Loading /> : signUpTurnout.length ? signUpTurnout.map((g) => <CheckedInRow key={g.name} {...g} />) : <p className="text-sm text-med-blue">No registration dates yet.</p>}
						</ChartCard>
						<ChartCard level={2} title="By ticket type" caption="Checked in of registered, across these events">
							{!loaded ? <Loading /> : ticketTypes.length ? ticketTypes.map((t) => <CheckedInRow key={t.name} {...t} />) : <p className="text-sm text-med-blue">No one registered.</p>}
						</ChartCard>
						{loaded &&
							repeatedQuestions.map((q) => (
								<ChartCard key={q.question} level={2} title={q.question} caption={`${q.answered} answers across ${q.events} events`} legend={answerSeries}>
									{q.answers.map((a) => (
										<AnswerRow key={a.name} {...a} answered={q.answered} />
									))}
								</ChartCard>
							))}
					</div>
				)}

				{results.length > 0 && (
					<div className="grid gap-4 xl:grid-cols-2">
						<ChartCard level={2} title="Regulars" caption="Came to two or more of these events">
							{loaded ? <PeopleList list={regularList} count={(p) => `${p.attended} of ${included.length} events`} empty="No one has come twice yet." /> : <Loading />}
						</ChartCard>
						<ChartCard level={2} title="Registered but never came" caption="Registered for three or more of these events and came to none">
							{loaded ? <PeopleList list={noShowList} count={(p) => `Registered ${p.registered} times`} empty="No one." /> : <Loading />}
						</ChartCard>
					</div>
				)}

				{results.length > 0 && (
					<div className="rounded-xl border border-med-blue bg-white px-4 py-4 md:px-6">
						<table className="w-full table-fixed text-sm leading-normal">
							<colgroup>
								<col />
								{wide && (
									<>
										<col className="w-[150px]" />
										<col className="w-[97.5px]" />
										<col className="w-[97.5px]" />
									</>
								)}
								<col className="w-[82.5px]" />
								{wide && <col className="w-[75px]" />}
							</colgroup>
							<thead>
								<tr className="font-display text-black">
									<th className="pt-1 pb-2 text-left">Event</th>
									{wide && (
										<>
											<th className="pt-1 pb-2 text-left">Date</th>
											<th className="pt-1 pb-2 text-right">On the list</th>
											<th className="pt-1 pb-2 text-right">Checked in</th>
										</>
									)}
									<th className="pt-1 pb-2 text-right">Turnout</th>
									{wide && <th className="pt-1 pb-2 text-right">Walk-ins</th>}
								</tr>
							</thead>
							<tbody>
								{[...results].reverse().map((r) => (
									<tr key={r.event.slug} className="border-t border-light-blue text-black">
										<td className="truncate py-2.5 pr-3 font-bold text-dark-blue">
											<Link to={`/events/${r.event.slug}/analytics`} className="hover:underline">
												{r.event.name}
											</Link>
											{!wide && (
												<span className="block truncate font-normal text-med-blue">
													{date(r)} · {r.checkedIn} of {r.registered}
												</span>
											)}
										</td>
										{wide && (
											<>
												<td className="py-2.5">{date(r)}</td>
												<td className="py-2.5 text-right">{r.registered}</td>
												<td className="py-2.5 text-right">{r.checkedIn}</td>
											</>
										)}
										<td className="py-2.5 text-right">{r.turnout}%</td>
										{wide && <td className="py-2.5 text-right">{r.walkIns}</td>}
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

/**
 * Not in Figma: the latest event in a sentence, against the others in the range, since the
 * question most visits start with is whether last time was better than usual.
 */
function LatestEvent({ latest, others, date }: { latest: EventResult; others: EventResult[]; date: string }) {
	const came = latest.checkedIn === 1 ? '1 person' : `${latest.checkedIn} people`;
	const walkIns = latest.walkIns === 0 ? '' : latest.walkIns === latest.checkedIn ? ', all walk-ins' : `, ${latest.walkIns} of them walk-in${latest.walkIns === 1 ? '' : 's'}`;
	const average = others.length ? others.reduce((n, r) => n + r.turnout, 0) / others.length : null;
	const against = others.length === 1 ? 'the event before it' : `the average of the other ${others.length} events`;
	return (
		<p className="max-w-prose text-lg leading-normal text-pretty">
			Latest:{' '}
			<Link to={`/events/${latest.event.slug}/analytics`} className="font-bold underline decoration-med-blue/50 underline-offset-4 hover:decoration-dark-blue">
				{latest.event.name}
			</Link>{' '}
			on {date}. <strong>{came}</strong> came{walkIns}: <strong>{latest.turnout}%</strong> of the {latest.registered} on the list.
			{average !== null && ` ${turnoutVersus(versusAverage(latest.turnout, average), against, 'That’s')}.`}
		</p>
	);
}

function Loading() {
	return <p className="py-6 text-center text-sm text-med-blue">Loading attendee lists…</p>;
}

/** People with what they did, the first few; the rest as a count. */
function PeopleList({ list, count, empty }: { list: Person[]; count: (p: Person) => string; empty: string }) {
	if (!list.length) return <p className="text-sm text-med-blue">{empty}</p>;
	return (
		<ul className="flex flex-col leading-normal">
			{list.slice(0, LIST_LENGTH).map((p) => (
				<li key={p.email} className="flex items-start gap-3 border-t border-light-blue py-2 first:border-t-0 first:pt-0">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-bold">{p.name || p.email}</p>
						<p className="truncate text-xs text-med-blue">{p.email}</p>
					</div>
					<p className="shrink-0 text-xs text-med-blue">{count(p)}</p>
				</li>
			))}
			{list.length > LIST_LENGTH && <li className="border-t border-light-blue pt-2 text-xs text-med-blue">and {list.length - LIST_LENGTH} more</li>}
		</ul>
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
				className="w-full appearance-none rounded-lg border border-med-blue bg-white py-2.5 pr-9 pl-3.5 text-sm leading-normal font-semibold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-med-blue"
			>
				{children}
			</select>
			<img src={chevron} alt="" width={13.5} height={13.5} className="pointer-events-none absolute top-1/2 right-[10.5px] -translate-y-1/2" />
		</label>
	);
}
