import { buttonClass } from '@checkpad/shared/button';
import { formatDay } from '@checkpad/shared/format';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import chevron from '../assets/chevron-small.svg';
import { Section, SectionRail } from '../components/AnalyticsSections';
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
	maxOf,
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
	latestTeam,
	turnoutVersus,
	versusAverage,
	type EventResult,
	type Person,
} from '../lib/analytics';
import { useEvents } from '../lib/events';
import { useMe } from '../lib/organisers';
import { useRosters } from '../lib/roster';
import { useTeams } from '../lib/teams';
import { useMediaQuery } from '../lib/useMediaQuery';

const turnoutSeries: Series[] = [{ name: 'Turnout', className: 'bg-dark-blue' }];
// Med-blue means walk-ins and nothing else. Every other second series is hollow, like Didn't
// come, so it reads by shape as well as colour and never passes for walk-ins.
const HOLLOW = 'border border-med-blue bg-white';
const attendanceSeries: Series[] = [
	{ name: 'Pre-registered', className: 'bg-dark-blue' },
	{ name: 'Walk-ins', className: 'bg-med-blue' },
	{ name: "Didn't come", className: HOLLOW },
];
const returningSeries: Series[] = [
	{ name: 'Returning', className: 'bg-dark-blue' },
	{ name: 'First-timers', className: HOLLOW },
];
const methodSeries: Series[] = [
	{ name: 'Self', className: 'bg-dark-blue' },
	{ name: 'Organiser', className: HOLLOW },
];
// One series, so no legend; it still names the table view's column
const signUpSeries: Series[] = [{ name: 'Middle registration', className: 'bg-dark-blue' }];
const answerSeries: Series[] = [
	{ name: 'Checked in', className: 'bg-dark-blue' },
	{ name: 'Not checked in', className: HOLLOW },
];
const LIST_LENGTH = 8;

// Figma "Analytics" (across events) at 75% scale. Phones get the tiles two by two, and a
// table of just the event (with its date) and turnout.
export default function AnalyticsPage() {
	const events = useEvents();
	const teams = useTeams() ?? [];
	const me = useMe();
	// The filters live in the URL (?team=…&range=…), so a reload, Back or a shared link keeps them.
	// Worked out every render rather than held in state, so a team list that arrives late still counts.
	const [params, setParams] = useSearchParams();
	const team = [params.get('team'), me.teamId, latestTeam(events, teams)].find((id) => id && teams.some((t) => t.id === id)) ?? teams[0]?.id ?? '';
	const range = ranges.find((r) => r.id === params.get('range')) ?? ranges.find((r) => r.id === '6')!;
	function setFilter(key: 'team' | 'range', value: string) {
		setParams(
			(p) => {
				const next = new URLSearchParams(p);
				next.set(key, value);
				return next;
			},
			{ replace: true },
		);
	}

	const included = useMemo(() => eventsInRange(events, team, range.months), [events, team, range]);
	// For offering a wider range when this one is too thin to compare
	const allTime = useMemo(() => eventsInRange(events, team, Infinity).length, [events, team]);
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
	const top = Math.max(75, Math.ceil(maxOf(results.map((r) => r.turnout)) / 25) * 25);
	const ticks = Array.from({ length: top / 25 + 1 }, (_, i) => i * 25);
	// The table's full columns take about 500px, so they wait for a wide window: from 1152px the
	// event names keep about 270px beside the sidebar. Narrower, date and counts go under the name.
	const wide = useMediaQuery('(min-width: 1152px)');
	// In the event's own time zone: an event on 1 January in Sydney is still 31 December in UTC
	const year = (r: (typeof results)[number]) => new Intl.DateTimeFormat('en-AU', { year: 'numeric', timeZone: r.event.timeZone }).format(new Date(r.event.startsAt));
	const spansYears = new Set(results.map(year)).size > 1;
	// The year only when the range spans more than one, so September 2025 and 2026 can't be confused
	const date = (r: (typeof results)[number]) => {
		const day = formatDay(new Date(r.event.startsAt), r.event.timeZone).replace(' ', ', ');
		return spansYears ? `${day} ${year(r)}` : day;
	};
	const month = (r: (typeof results)[number]) => new Intl.DateTimeFormat('en-AU', { month: 'short', timeZone: r.event.timeZone }).format(new Date(r.event.startsAt));
	const showLabel = thinLabels(results.length);
	const axisLabel = (r: (typeof results)[number], i: number) => (showLabel(i) ? month(r) : '');

	return (
		<>
			<PageHeader
				actionsRowOnPhones
				title="Analytics"
				actions={
					<div className="flex items-center gap-2.5 max-md:w-full max-md:*:flex-1">
						<Filter label="Team" value={team} onChange={(v) => setFilter('team', v)}>
							{teams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Filter>
						<Filter label="Time range" value={range.id} onChange={(v) => setFilter('range', v)}>
							{ranges.map((r) => (
								<option key={r.id} value={r.id}>
									{r.label}
								</option>
							))}
						</Filter>
					</div>
				}
			/>
			<div className="flex flex-col gap-8 px-6 pt-3.5 pb-7">
				<div className="flex flex-col gap-5">
					{latest && <LatestEvent latest={latest} others={results.slice(0, -1)} date={date(latest)} />}
					{/* Turnout is how a night is judged, so it leads; the others support it. With no
					    finished events there's nothing to show, and NothingToCompare says so below. */}
					{results.length > 0 && (
					<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
						{/* A share of nothing is no result, not 0%: those tiles show a dash until there's something to divide */}
						<StatTile
							size="lg"
							className="col-span-2 md:col-span-3 xl:col-span-2"
							label="Turnout"
							value={onList ? `${percent(checkIns, onList)}%` : '–'}
							note={`${checkIns} of the ${onList} on the list came, walk-ins included, across ${included.length} ${included.length === 1 ? 'event' : 'events'} (${monthSpan(included)})`}
						/>
						<StatTile
							label="Returning"
							value={loaded && checkIns ? `${returning}%` : '–'}
							note={loaded ? 'came to an earlier event' : 'Loading attendee lists…'}
						/>
						<StatTile label="Walk-ins" value={checkIns ? `${percent(walkIns, checkIns)}%` : '–'} note={`${walkIns} of check-ins`} />
						<StatTile
							label="Self check-in"
							value={loaded && recordedCheckIns ? `${percent(selfCheckIns, recordedCheckIns)}%` : '–'}
							note={!loaded ? 'Loading attendee lists…' : recorded.length < included.length ? 'not recorded for older events' : 'on the attendee page'}
						/>
					</div>
					)}
				</div>
				{results.length >= 2 ? (
					// Wide windows: the sections beside a rail of them, under the overview
					<div className="flex items-start gap-6">
						<div className="flex min-w-0 flex-1 flex-col gap-8">
							<Section level={2} title="Turnout">
								<div className="grid gap-4 xl:grid-cols-2">
								<ChartCard level={3} title="Turnout by event" caption="Share of everyone on the list who checked in, walk-ins included">
									<BarChart
										label="Turnout by event"
										heading="Event"
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
								<ChartCard level={3} title="Attendance by event" caption="Everyone on the list, by whether they came" legend={attendanceSeries}>
									<BarChart
										label="Attendance by event"
										heading="Event"
										series={attendanceSeries}
										ticks={niceTicks(maxOf(results.map((r) => r.registered), 1))}
										bars={results.map((r, i) => ({
											label: axisLabel(r, i),
											values: [r.checkedIn - r.walkIns, r.walkIns, r.registered - r.checkedIn],
											title: r.event.name,
											lines: [
												`${r.checkedIn - r.walkIns} pre-registered`,
												`${r.walkIns} walk-ins · ${percent(r.walkIns, r.checkedIn)}% of check-ins`,
												`${r.registered - r.checkedIn} didn't come`,
											],
											// Came, of everyone on the list, so the label matches the whole stack it sits on
											showValue: r === latest ? `${r.checkedIn} of ${r.registered}` : undefined,
										}))}
									/>
								</ChartCard>
								</div>
								<EventTable results={results} wide={wide} date={date} />
							</Section>
							<Section level={2} title="Registrations">
								<div className="grid gap-4 xl:grid-cols-2">
								<ChartCard level={3} title="How early people register" caption="Middle registration, days before each event">
									{!loaded ? (
										<Loading />
									) : anyDates ? (
										<BarChart
											label="Middle registration by event"
											heading="Event"
											series={signUpSeries}
											ticks={niceTicks(maxOf(signUps.map((s) => s.medianDaysBefore ?? 0), 1))}
											bars={results.map((r, i) => {
												const s = signUps[i];
												return {
													label: axisLabel(r, i),
													values: [s.medianDaysBefore ?? 0],
													cells: s.medianDaysBefore === null ? ['–'] : undefined,
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
								<ChartCard level={3} title="Turnout by sign-up timing" caption="Checked in across these events, by how early they registered">
									{!loaded ? <Loading /> : signUpTurnout.length ? signUpTurnout.map((g) => <CheckedInRow key={g.name} {...g} />) : <p className="text-sm text-med-blue">No registration dates yet.</p>}
								</ChartCard>
								{/* A single ticket type ("Other" when the import had none) has nothing to break down */}
								{(!loaded || ticketTypes.length > 1) && (
									<ChartCard level={3} title="By ticket type" caption="Checked in of registered, across these events">
										{!loaded ? <Loading /> : ticketTypes.map((t) => <CheckedInRow key={t.name} {...t} />)}
									</ChartCard>
								)}
								{loaded &&
									repeatedQuestions.map((q) => (
										<ChartCard key={q.question} level={3} title={q.question} caption={`${q.answered} answers across ${q.events} events`} legend={answerSeries}>
											{q.answers.map((a) => (
												<AnswerRow key={a.name} {...a} answered={q.answered} />
											))}
										</ChartCard>
									))}
								</div>
							</Section>
							<Section level={2} title="Audience">
								<ChartCard level={3} title="New and returning" caption="Check-ins by whether they came to an earlier event" legend={returningSeries}>
									{loaded ? (
										<BarChart
											label="New and returning by event"
											heading="Event"
											series={returningSeries}
											ticks={niceTicks(maxOf(detail.map((d) => d.split.returning + d.split.firstTime), 1))}
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
								<div className="grid items-start gap-4 xl:grid-cols-2">
									<ChartCard level={3} title="Regulars" caption="Came to two or more of these events">
										{loaded ? <PeopleList list={regularList} count={(p) => `${p.attended} of ${included.length} events`} empty="No one has come twice yet." /> : <Loading />}
									</ChartCard>
									<ChartCard level={3} title="Registered but never came" caption="Registered for three or more of these events and came to none">
										{loaded ? <NoShows list={noShowList} /> : <Loading />}
									</ChartCard>
								</div>
							</Section>
							<Section level={2} title="Check-in">
								<ChartCard level={3} title="How people checked in" caption="On the attendee page or by an organiser" legend={methodSeries}>
									{loaded ? (
										<BarChart
											label="Check-in method by event"
											heading="Event"
											series={methodSeries}
											ticks={niceTicks(maxOf(detail.map((d) => (d.methods ? d.methods.self + d.methods.staff : 0)), 1))}
											bars={results.map((r, i) => {
												const m = detail[i].methods;
												return {
													label: axisLabel(r, i),
													values: m ? [m.self, m.staff] : [0, 0],
													cells: m ? undefined : ['–', '–'],
													title: r.event.name,
													lines: m ? [`${m.self} self · ${percent(m.self, m.self + m.staff)}%`, `${m.staff} by an organiser`] : ['Not recorded in the old check-in app'],
												};
											})}
										/>
									) : (
										<Loading />
									)}
								</ChartCard>
							</Section>
						</div>
						<SectionRail sections={SECTIONS} />
					</div>
				) : (
					<NothingToCompare
						results={results}
						teamName={teams.find((t) => t.id === team)?.name ?? 'This team'}
						range={range}
						allTime={allTime}
						onShowAllTime={() => setFilter('range', 'all')}
					/>
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
			on {date}.{' '}
			{latest.checkedIn ? (
				<>
					<strong>{came}</strong> came{walkIns}: <strong>{latest.turnout}%</strong> of the {latest.registered} on the list.
				</>
			) : (
				`None of the ${latest.registered} on the list checked in.`
			)}
			{average !== null && ` ${turnoutVersus(versusAverage(latest.turnout, average), against, 'That’s')}.`}
		</p>
	);
}

const SECTIONS = ['Turnout', 'Registrations', 'Audience', 'Check-in'];

type SortKey = 'name' | 'date' | 'onList' | 'checkedIn' | 'turnout' | 'walkIns';

const columns: { key: SortKey; label: string; right?: boolean; value: (r: EventResult) => number | string; order: [string, string] }[] = [
	{ key: 'name', label: 'Event', value: (r) => r.event.name.toLowerCase(), order: ['Event names A to Z', 'Event names Z to A'] },
	{ key: 'date', label: 'Date', value: (r) => r.event.startsAt, order: ['Oldest first', 'Newest first'] },
	{ key: 'onList', label: 'On the list', right: true, value: (r) => r.registered, order: ['Fewest on the list first', 'Most on the list first'] },
	{ key: 'checkedIn', label: 'Checked in', right: true, value: (r) => r.checkedIn, order: ['Fewest checked in first', 'Most checked in first'] },
	{ key: 'turnout', label: 'Turnout', right: true, value: (r) => r.turnout, order: ['Lowest turnout first', 'Highest turnout first'] },
	{ key: 'walkIns', label: 'Walk-ins', right: true, value: (r) => r.walkIns, order: ['Fewest walk-ins first', 'Most walk-ins first'] },
];

/**
 * Every event in the range, newest first, each linking to its own analytics. Any column
 * heading sorts by it; choosing it again reverses. Narrow windows keep Event and Turnout,
 * with the date and counts under the name.
 */
function EventTable({ results, wide, date }: { results: EventResult[]; wide: boolean; date: (r: EventResult) => string }) {
	const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'date', descending: true });
	const shown = columns.filter((c) => wide || c.key === 'name' || c.key === 'turnout');
	const column = columns.find((c) => c.key === sort.key)!;
	const rows = [...results].sort((a, b) => {
		const x = column.value(a);
		const y = column.value(b);
		const order = x < y ? -1 : x > y ? 1 : b.event.startsAt.localeCompare(a.event.startsAt);
		return sort.descending ? -order : order;
	});
	// The first time, also say the headings sort
	const caption = `${column.order[sort.descending ? 1 : 0]}.${sort.key === 'date' && sort.descending ? ' Choose a column heading to sort by it.' : ''}`;

	function choose(key: SortKey) {
		// Names start A to Z; dates and numbers start with the biggest
		setSort((s) => (s.key === key ? { key, descending: !s.descending } : { key, descending: key !== 'name' }));
	}

	return (
		<ChartCard level={3} title="Every event" caption={caption}>
			<table className="w-full table-fixed text-sm leading-normal">
				<colgroup>
					<col />
					{wide && (
						<>
							<col className="w-[150px]" />
							<col className="w-[105px]" />
							<col className="w-[105px]" />
						</>
					)}
					<col className="w-[90px]" />
					{wide && <col className="w-[90px]" />}
				</colgroup>
				<thead>
					<tr className="font-display text-dark-blue">
						{shown.map((c) => {
							const active = c.key === sort.key;
							return (
								<th key={c.key} scope="col" aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined} className={`pt-1 pb-2 ${c.right ? 'text-right' : 'text-left'}`}>
									<button
										type="button"
										onClick={() => choose(c.key)}
										className={`inline-flex items-center gap-1 rounded font-display outline-none hover:text-med-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-med-blue ${c.right ? 'flex-row-reverse' : ''}`}
									>
										{c.label}
										<svg aria-hidden="true" viewBox="0 0 8 8" className={`size-2 shrink-0 fill-current ${active ? '' : 'invisible'}`}>
											<path d={active && !sort.descending ? 'M4 1 8 7H0z' : 'M4 7 0 1h8z'} />
										</svg>
									</button>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr key={r.event.slug} className="border-t border-light-blue text-dark-blue">
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
									<td className="py-2.5 text-right tabular-nums">{r.registered}</td>
									<td className="py-2.5 text-right tabular-nums">{r.checkedIn}</td>
								</>
							)}
							<td className="py-2.5 text-right tabular-nums">{r.turnout}%</td>
							{wide && <td className="py-2.5 text-right tabular-nums">{r.walkIns}</td>}
						</tr>
					))}
				</tbody>
			</table>
		</ChartCard>
	);
}

/**
 * Under two finished events there's nothing to compare, and every chart would be one bar or
 * none. Say so, and point to what does have something to show: the one event's own analytics,
 * or a wider range when the team has more events outside this one.
 */
function NothingToCompare({
	results,
	teamName,
	range,
	allTime,
	onShowAllTime,
}: {
	results: EventResult[];
	teamName: string;
	range: (typeof ranges)[number];
	allTime: number;
	onShowAllTime: () => void;
}) {
	const only = results[0];
	const within = range.id === 'all' ? '' : ` in the ${range.label.toLowerCase()}`;
	const widen = range.id !== 'all' && allTime > results.length;
	return (
		<section className="flex flex-col items-start gap-4 rounded-xl border border-med-blue bg-white px-6 py-6">
			<div className="flex max-w-prose flex-col gap-1.5 leading-normal">
				<h2 className="font-display text-lg">{only ? 'Nothing to compare yet' : `No finished events${within}`}</h2>
				<p className="text-sm text-pretty">
					{only
						? `${only.event.name} is ${teamName}’s only finished event${within}. This page compares events, so its charts fill in after the next one. Until then, the event’s own analytics has the detail.`
						: allTime
							? `${teamName} has ${allTime} finished ${allTime === 1 ? 'event' : 'events'} outside this range.`
							: `Analytics fills in once ${teamName}’s first event has finished.`}
				</p>
			</div>
			{(only || widen) && (
				<div className="flex flex-wrap gap-2.5">
					{only && (
						<Link to={`/events/${only.event.slug}/analytics`} className={buttonClass('primary')}>
							See {only.event.name}’s analytics
						</Link>
					)}
					{widen && (
						<button type="button" onClick={onShowAllTime} className={buttonClass(only ? 'secondary' : 'primary')}>
							Show all time ({allTime} {allTime === 1 ? 'event' : 'events'})
						</button>
					)}
				</div>
			)}
		</section>
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
						{/* Names only, as an organiser might share their screen; the email stands in for a missing name */}
						<p className="truncate text-sm font-bold">{p.name || p.email}</p>
					</div>
					<p className="shrink-0 text-xs text-med-blue">{count(p)}</p>
				</li>
			))}
			{list.length > LIST_LENGTH && <li className="border-t border-light-blue pt-2 text-xs text-med-blue">and {list.length - LIST_LENGTH} more</li>}
		</ul>
	);
}

/**
 * Repeat no-shows, as a count. Names are a deliberate step behind "Show people" and come
 * without emails: enough for an organiser to recognise someone, without the card reading as a
 * list kept on the community (PRODUCT.md, attendee privacy). Someone with no name shows by email,
 * or they couldn't be told apart.
 */
function NoShows({ list }: { list: Person[] }) {
	const [open, setOpen] = useState(false);
	if (!list.length) return <p className="text-sm text-med-blue">No one.</p>;
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-end justify-between gap-3">
				<p className="flex items-baseline gap-2">
					<span className="font-display text-4xl leading-tight tabular-nums">{list.length}</span>
					<span className="text-sm text-med-blue">{list.length === 1 ? 'person' : 'people'}</span>
				</p>
				<button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonClass('secondary', 'sm')}>
					{open ? 'Hide people' : 'Show people'}
				</button>
			</div>
			{open && <PeopleList list={list} count={(p) => `Registered ${p.registered} times`} empty="No one." />}
		</div>
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
