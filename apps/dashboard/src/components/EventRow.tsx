import { formatClockTime, isMultiDay } from '@checkpad/shared/format';
import { useId } from 'react';
import { Link } from 'react-router';
import { eventPhase } from '../lib/eventPhase';
import { eventNameOut, useTransitionLink } from '../lib/pageTransition';
import type { EventSummary } from '../lib/events';
import CheckInBar from './CheckInBar';
import EventMenu from './EventMenu';

const part = (date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('en-AU', { timeZone, ...options }).format(date);

/**
 * "Thu · 18:00–21:00", ending after midnight when it runs late ("Fri · 18:00–01:00"). Over
 * several days, through to the end: "Sat 09:00 – Sun 15 Mar 17:00" (the date column has the start).
 */
function when(start: Date, end: Date, timeZone: string) {
	if (isMultiDay(start, end, timeZone)) {
		// Built from parts: en-AU would put a comma after the weekday ("Sun, 12 May")
		const year = (d: Date) => part(d, timeZone, { year: 'numeric' });
		const endDay = [part(end, timeZone, { weekday: 'short' }), part(end, timeZone, { day: 'numeric' }), part(end, timeZone, { month: 'short' }).slice(0, 3)];
		if (year(end) !== year(start)) endDay.push(year(end));
		return `${part(start, timeZone, { weekday: 'short' })} ${formatClockTime(start, timeZone)} – ${endDay.join(' ')} ${formatClockTime(end, timeZone)}`;
	}
	return `${part(start, timeZone, { weekday: 'short' })} · ${formatClockTime(start, timeZone)}–${formatClockTime(end, timeZone)}`;
}

/**
 * An upcoming or past event, as one row of the Events page's list: scanned by date, opened when
 * needed. Upcoming rows say how many registered; past rows say how many came, with a thin
 * turnout bar. On phones the number moves under the name.
 */
export default function EventRow({
	summary,
	team,
	first,
	last,
}: {
	summary: EventSummary;
	/** Shown when the viewer sees several teams' events. */
	team?: string;
	/** The list's first and last visible rows, whose hover fills its rounded corners. */
	first: boolean;
	last: boolean;
}) {
	const { event, stats } = summary;
	const past = eventPhase(event) === 'past';
	const id = useId();
	const open = useTransitionLink(`/events/${event.slug}`, eventNameOut);
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	const { timeZone } = event;
	// Only events from another year say which, under the day
	const year = part(start, timeZone, { year: 'numeric' });
	const thisYear = year === part(new Date(), timeZone, { year: 'numeric' });
	const corners = `${first ? 'rounded-t-xl' : ''} ${last ? 'rounded-b-xl' : ''}`;
	const turnout = stats.total ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

	return (
		<div className={`relative grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 pr-3 pl-4 hover:bg-off-white/70 ${corners} md:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto] md:gap-x-6 md:py-4 md:pr-4 md:pl-5`}>
			{/* The date, for scanning down the list */}
			<p className="row-span-2 flex flex-col items-center self-start md:row-span-1 md:self-center">
				<span className="text-xs leading-normal font-bold tracking-normal text-med-blue uppercase">{/* Three letters for every month (en-AU writes "Sept"), so the column keeps its rhythm */}
					{part(start, timeZone, { month: 'short' }).slice(0, 3)}</span>
				<span className="font-display text-2xl leading-none tabular-nums">{part(start, timeZone, { day: 'numeric' })}</span>
				{!thisYear && <span className="pt-1 text-xs leading-normal text-med-blue tabular-nums">{year}</span>}
			</p>

			<div className="flex min-w-0 flex-col gap-0.5">
				{/* The name travels to the event's page title when the row is opened (pageTransition) */}
				<h3 data-event-name={event.slug} className="line-clamp-2 font-display text-base md:truncate md:text-lg">
					{/* Stretched link: the whole row opens the event, except its menu */}
					<Link to={`/events/${event.slug}`} onClick={open} aria-describedby={`${id}-count`} className={`after:absolute after:inset-0 ${first ? 'after:rounded-t-xl' : ''} ${last ? 'after:rounded-b-xl' : ''}`}>
						{event.name}
					</Link>
				</h3>
				<p className="text-sm leading-normal text-dark-blue/80 md:truncate">
					{when(start, end, timeZone)}
					{/* Its own line on phones, so a team name never splits */}
					{team && (
						<span className="block text-med-blue md:inline">
							<span className="hidden md:inline"> · </span>
							{team}
						</span>
					)}
				</p>
			</div>

			{/* Under the name on phones, its own column from md */}
			<div id={`${id}-count`} className="col-start-2 row-start-2 md:col-start-3 md:row-start-1 md:w-44">
				{past ? (
					stats.total === 0 ? (
						<p className="text-sm leading-normal text-med-blue md:text-right">No one registered</p>
					) : (
						<div className="flex flex-col gap-1.5">
							<p className="text-sm leading-normal tabular-nums md:text-right">
								<span className="font-bold">{stats.checkedIn}</span> of {stats.total} attended
								<span className="text-med-blue"> · {turnout}%</span>
							</p>
							<CheckInBar stats={stats} size="sm" />
						</div>
					)
				) : (
					<p className="text-sm leading-normal tabular-nums md:text-right">
						<span className="font-bold">{stats.total}</span> registered
					</p>
				)}
			</div>

			<EventMenu event={event} className="col-start-3 row-start-1 -mr-1 md:col-start-4" />
		</div>
	);
}
