import { buttonClass } from '@checkpad/shared/button';
import { formatClockTime } from '@checkpad/shared/format';
import { useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useParams } from 'react-router';
import undo from '../assets/undo.svg';
import EventOverview from '../components/EventOverview';
import { TextField } from '../components/Field';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { WalkInCard, WalkInDialog } from '../components/WalkIn';
import { checkIn, findAttendee, fullName, initials, looksLikeEmail, walkInTicketPrefix } from '../lib/checkIn';
import { useEvent, type DashboardEvent } from '../lib/events';
import type { RosterAttendee } from '../lib/mock';
import { nextWalkInTicket, rosterStats, setCheckedIn, useRoster } from '../lib/roster';
import { useIsDesktop } from '../lib/useMediaQuery';

type Result = { kind: 'found'; attendee: RosterAttendee } | { kind: 'not-found'; query: string } | null;

// Figma "Check in – found / already arrived / not found" (desktop, 75% scale) and
// "Staff check in (mobile)" (full size). Staff look someone up by email or ticket number.
export default function CheckInPage() {
	const { slug = '' } = useParams();
	// EventLayout has already redirected unknown slugs.
	const event = useEvent(slug)!;
	const roster = useRoster(slug);
	const desktop = useIsDesktop();
	const stats = useMemo(() => rosterStats(roster), [roster]);
	const recent = useMemo(
		() =>
			roster
				.filter((a) => a.checkedInAt)
				.sort((a, b) => b.checkedInAt!.getTime() - a.checkedInAt!.getTime())
				.slice(0, desktop ? 3 : 2),
		[roster, desktop],
	);

	const [query, setQuery] = useState('');
	const [searched, setSearched] = useState<string | null>(null);
	const [walkInFor, setWalkInFor] = useState<string | null>(null);
	const input = useRef<HTMLInputElement>(null);

	// Looked up live, so the card follows check-ins and undos made elsewhere.
	const found = searched ? findAttendee(roster, searched) : undefined;
	const result: Result = found ? { kind: 'found', attendee: found } : searched ? { kind: 'not-found', query: searched } : null;
	const ticket = nextWalkInTicket(roster, walkInTicketPrefix(event));

	function find(e: FormEvent) {
		e.preventDefault();
		setSearched(query.trim() || null);
	}

	/** Clears the search for the next person in the queue. */
	function reset() {
		setQuery('');
		setSearched(null);
		input.current?.focus();
	}

	const actions = {
		checkIn: (a: RosterAttendee) => {
			checkIn(slug, a);
			reset();
		},
		undo: (a: RosterAttendee) => setCheckedIn(slug, a.id, null),
		addWalkIn: (q: string) => setWalkInFor(q),
	};

	if (!desktop) {
		return (
			<MobileCheckIn
				event={event}
				checkedIn={stats.checkedIn}
				total={stats.total}
				recent={recent}
				query={query}
				setQuery={setQuery}
				input={input}
				find={find}
				result={result}
				ticket={ticket}
				walkInFor={walkInFor}
				closeWalkIn={() => {
					setWalkInFor(null);
					reset();
				}}
				{...actions}
			/>
		);
	}

	return (
		<>
			<EventOverview event={event} />
			<PageHeader
				level={2}
				title="Check in"
				// 24px above (the gap below the event details); sticks with 24px left, like the page headers
				className="top-0 pt-6 pb-[15px]"
				actions={
					<p className="flex items-baseline gap-1.5 whitespace-nowrap">
						<span className="font-display text-2xl leading-[1.2]">{stats.checkedIn}</span>
						<span className="text-[15px] leading-[1.5] text-med-blue">of {stats.total} checked in</span>
					</p>
				}
			/>
			<div className="flex flex-col gap-[15px] px-6 pb-[27px]">
				<form onSubmit={find} className="flex items-end gap-3 rounded-xl border border-med-blue bg-white px-6 py-[21px]">
					<TextField
						ref={input}
						label="Email or ticket number"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="jane@example.com"
						autoComplete="off"
						spellCheck={false}
						autoFocus
						className="min-w-0 flex-1"
					/>
					<button type="submit" className={buttonClass('primary')}>
						Find
					</button>
				</form>

				{result?.kind === 'found' && <DesktopFound attendee={result.attendee} timeZone={event.timeZone} {...actions} />}
				{result?.kind === 'not-found' && (
					<section aria-live="polite" className="flex items-center gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
						<div className="flex min-w-0 flex-1 flex-col gap-[4.5px]">
							<h3 className="font-display text-[21px] leading-[1.2]">{notFoundTitle(result.query)}</h3>
							<p className="text-[15px] leading-[1.5] text-med-blue">
								Check the spelling, or add them as a walk-in. They’ll get ticket {ticket}.
							</p>
						</div>
						<button type="button" onClick={() => actions.addWalkIn(result.query)} className={buttonClass('primary')}>
							Add as walk-in
						</button>
					</section>
				)}

				<section className="flex flex-col gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
					<h3 className="font-display text-lg">Recent check-ins</h3>
					{recent.length === 0 && <p className="text-[15px] text-med-blue">No one has checked in yet.</p>}
					<ul className="flex flex-col gap-[15px]">
						{recent.map((a) => (
							<li key={a.id} className="flex items-center gap-[10.5px] py-[3px] leading-[1.5]">
								<span
									aria-hidden="true"
									className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-[12.75px]"
								>
									{initials(a)}
								</span>
								<div className="flex min-w-0 flex-1 flex-col gap-[1.5px] text-black">
									<p className="truncate font-display text-[15px]">{fullName(a)}</p>
									<p className="truncate text-xs">{a.email}</p>
								</div>
								<p className="shrink-0 font-mono text-[13.5px] text-black">{a.ticket}</p>
								<p className="w-[45px] shrink-0 text-right text-[15px] text-med-blue">{formatClockTime(a.checkedInAt!, event.timeZone)}</p>
							</li>
						))}
					</ul>
				</section>
			</div>
			{walkInFor !== null && (
				<WalkInDialog
					event={event}
					initialEmail={walkInFor}
					onClose={() => {
						setWalkInFor(null);
						reset();
					}}
				/>
			)}
		</>
	);
}

function notFoundTitle(query: string) {
	return looksLikeEmail(query) ? 'No one registered with that email' : 'No one has that ticket number';
}

interface Actions {
	checkIn: (a: RosterAttendee) => void;
	undo: (a: RosterAttendee) => void;
	addWalkIn: (query: string) => void;
}

function DesktopFound({ attendee, timeZone, checkIn, undo: undoCheckIn }: { attendee: RosterAttendee; timeZone: string } & Actions) {
	const name = fullName(attendee);
	return (
		<section aria-live="polite" aria-label="Result" className="flex items-center gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
			<span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-xl">
				{initials(attendee)}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-[3px] text-black">
				<h3 className="truncate font-display text-2xl leading-[1.2]">{name}</h3>
				<p className="truncate text-[15px] leading-[1.5]">{attendee.email}</p>
			</div>
			<div className="flex shrink-0 flex-col gap-[3px] pr-[18px] leading-[1.5]">
				<p className="text-[13.5px] font-bold text-med-blue">Ticket</p>
				<p className="font-mono text-[15px] text-black">{attendee.ticket}</p>
			</div>
			{attendee.checkedInAt ? (
				<div className="flex shrink-0 items-center gap-3">
					<p className="flex flex-col items-end text-[15px] leading-[1.5]">
						<span className="font-bold">Already arrived</span>
						<span className="text-med-blue">{formatClockTime(attendee.checkedInAt, timeZone)}</span>
					</p>
					<button
						type="button"
						aria-label={`Undo check-in for ${name}`}
						title="Undo check-in"
						onClick={() => undoCheckIn(attendee)}
						className="rounded p-0.5 hover:bg-light-blue/60"
					>
						<img src={undo} alt="" width={21} height={21} />
					</button>
				</div>
			) : (
				<button type="button" onClick={() => checkIn(attendee)} className={buttonClass('primary')} autoFocus>
					Check in
				</button>
			)}
		</section>
	);
}

interface MobileProps extends Actions {
	event: DashboardEvent;
	checkedIn: number;
	total: number;
	recent: RosterAttendee[];
	query: string;
	setQuery: (q: string) => void;
	input: RefObject<HTMLInputElement | null>;
	find: (e: FormEvent) => void;
	result: Result;
	ticket: string;
	walkInFor: string | null;
	closeWalkIn: () => void;
}

function MobileCheckIn(p: MobileProps) {
	return (
		<div className="flex flex-col gap-6 px-5 pb-6">
			<section className="flex flex-col gap-2">
				<h1 className="font-display text-[28px] leading-[1.2]">{p.event.name}</h1>
				<div className="flex items-center gap-2.5">
					<p className="flex min-w-0 flex-1 items-baseline gap-1.5 leading-[1.5] whitespace-nowrap">
						<span className="font-display text-2xl">{p.checkedIn}</span>
						<span className="text-lg text-med-blue">of {p.total} checked in</span>
					</p>
					<StatusBadge open={p.event.selfCheckInOpen} size="lg" />
				</div>
			</section>

			{p.walkInFor !== null ? (
				<WalkInCard event={p.event} initialEmail={p.walkInFor} onClose={p.closeWalkIn} />
			) : (
				<>
					<form onSubmit={p.find} className="flex flex-col gap-4 rounded-2xl border border-med-blue bg-white p-5">
						<TextField
							ref={p.input}
							size="lg"
							label="Email or ticket number"
							value={p.query}
							onChange={(e) => p.setQuery(e.target.value)}
							placeholder="jane@example.com"
							type="search"
							inputMode="email"
							autoComplete="off"
							autoCapitalize="off"
							spellCheck={false}
						/>
						<button type="submit" className={`w-full ${buttonClass('primary', 'lg')}`}>
							Find
						</button>
					</form>

					{p.result?.kind === 'found' && <MobileFound attendee={p.result.attendee} timeZone={p.event.timeZone} {...p} />}
					{p.result?.kind === 'not-found' && (
						<section aria-live="polite" className="flex flex-col gap-5 rounded-2xl border border-med-blue bg-white p-5">
							<h2 className="font-display text-2xl leading-[1.5]">{notFoundTitle(p.result.query)}</h2>
							<p className="text-lg leading-[1.5] text-med-blue">Check the spelling, or add them as a walk-in. They’ll get ticket {p.ticket}.</p>
							<button type="button" onClick={() => p.addWalkIn((p.result as { query: string }).query)} className={`w-full ${buttonClass('primary', 'lg')}`}>
								Add as walk-in
							</button>
						</section>
					)}

					<section className="flex flex-col gap-3 rounded-2xl border border-med-blue bg-white p-5 leading-[1.5]">
						<h2 className="font-display text-xl">Recent check-ins</h2>
						{p.recent.length === 0 && <p className="text-lg text-med-blue">No one has checked in yet.</p>}
						<ul className="flex flex-col gap-3">
							{p.recent.map((a) => (
								<li key={a.id} className="flex items-center gap-3 py-1 text-lg">
									<p className="min-w-0 flex-1 truncate font-bold text-black">{fullName(a)}</p>
									<p className="shrink-0 text-med-blue">{formatClockTime(a.checkedInAt!, p.event.timeZone)}</p>
								</li>
							))}
						</ul>
					</section>
				</>
			)}
		</div>
	);
}

function MobileFound({ attendee, timeZone, checkIn, undo: undoCheckIn }: { attendee: RosterAttendee; timeZone: string } & Actions) {
	return (
		<section aria-live="polite" aria-label="Result" className="flex flex-col gap-5 rounded-2xl border border-med-blue bg-white p-5">
			<div className="flex items-center gap-3.5">
				<span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-[19px]">
					{initials(attendee)}
				</span>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5] text-black">
					<h2 className="truncate font-display text-2xl">{fullName(attendee)}</h2>
					<p className="truncate text-lg">{attendee.email}</p>
				</div>
			</div>
			<div className="flex items-center gap-2.5 rounded-[10px] bg-off-white px-4 py-2.5 leading-[1.5]">
				<p className="min-w-0 flex-1 text-base font-bold text-med-blue">Ticket</p>
				<p className="shrink-0 font-mono text-lg text-black">{attendee.ticket}</p>
			</div>
			{attendee.checkedInAt ? (
				<div className="flex items-center gap-3 rounded-[10px] bg-off-white py-3 pr-3 pl-4">
					<div className="flex min-w-0 flex-1 flex-col leading-[1.5]">
						<p className="text-lg font-bold">Already arrived</p>
						<p className="text-base text-med-blue">Checked in at {formatClockTime(attendee.checkedInAt, timeZone)}</p>
					</div>
					<button
						type="button"
						onClick={() => undoCheckIn(attendee)}
						// Figma's secondary button with an 18px label (between buttonClass md and lg)
						className="shrink-0 rounded-[12px] bg-light-blue px-10 py-3 font-display text-lg leading-[1.5] transition-colors hover:bg-light-blue-hover"
					>
						Undo
					</button>
				</div>
			) : (
				<button type="button" onClick={() => checkIn(attendee)} className={`w-full ${buttonClass('primary', 'lg')}`}>
					Check in {attendee.firstName}
				</button>
			)}
		</section>
	);
}
