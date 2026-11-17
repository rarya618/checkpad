import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import calendar from '../assets/calendar.svg';
import chevron from '../assets/chevron-small.svg';
import { Field } from './Field';

// The event form's dates: two fields that read as words ("Sat 11 May 2030") and one calendar
// that picks a range, start day then end day. Nothing is typed, so there's no half-typed date.
// Dates are wall-clock "YYYY-MM-DD" strings, done in UTC so no time zone shifts a day.

const DAY = 86_400_000;
const parse = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => iso(parse(date) + days * DAY);
/** The same day `months` later, or the month's last day when it's shorter. */
function addMonths(date: string, months: number) {
	const d = new Date(parse(date));
	const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
	const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
	target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
	return iso(target.getTime());
}
/** Monday first, as Australian calendars have it: 0 is Monday, 6 Sunday. */
const weekday = (date: string) => (new Date(parse(date)).getUTCDay() + 6) % 7;
const format = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-AU', { timeZone: 'UTC', ...options }).format(parse(date));
/** Today on this device's clock. */
export const today = () => {
	const now = new Date();
	return iso(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
};

/** "Sat 11 May 2030", built from parts: en-AU would add a comma after the weekday. */
export function longDate(date: string) {
	return [format(date, { weekday: 'short' }), format(date, { day: 'numeric' }), format(date, { month: 'long' }), format(date, { year: 'numeric' })].join(' ');
}

/** A date field that opens the calendar: a filled box like the text fields, with the date in words. */
export function DateTrigger({
	label,
	value,
	open,
	onOpen,
	hint,
	error,
	ref,
}: {
	label: string;
	value: string;
	open: boolean;
	onOpen: () => void;
	hint?: string;
	error?: string | null;
	ref?: Ref<HTMLButtonElement>;
}) {
	return (
		<Field label={label} hint={hint} error={error} className="min-w-0">
			{(control) => (
				<button
					ref={ref}
					type="button"
					{...control}
					aria-haspopup="dialog"
					aria-expanded={open}
					onClick={onOpen}
					className={`flex w-full items-center justify-between gap-3 rounded-lg bg-off-white px-5 py-3 text-left text-base leading-normal outline-none hover:bg-light-blue/50 focus-visible:outline-[1.5px] focus-visible:-outline-offset-[1.5px] focus-visible:outline-med-blue ${
						open ? 'outline-[1.5px] -outline-offset-[1.5px] outline-med-blue' : ''
					}`}
				>
					<span className={`truncate ${value ? 'text-dark-blue' : 'text-dark-blue/30'}`}>{value ? longDate(value) : 'Choose a date'}</span>
					<img src={calendar} alt="" width={18} height={18} className="shrink-0" />
				</button>
			)}
		</Field>
	);
}

interface CalendarProps {
	/** Which end is being picked: the start, then the end. */
	mode: 'start' | 'end';
	start: string;
	end: string;
	onPick: (date: string) => void;
	onClose: () => void;
}

/**
 * One month, Monday first. The start and end are navy circles, the days between share a
 * light-blue band, and while the end is being picked the band follows the pointer. Days before
 * the start can't be the end (picking the start again makes it one day). Arrow keys move by day and week, Page Up and Down by month (with
 * Shift, a year), Home and End to the week's ends, Enter picks, Escape closes.
 */
export function RangeCalendar({ mode, start, end, onPick, onClose }: CalendarProps) {
	const [focused, setFocused] = useState(() => (mode === 'end' ? end || start : start) || today());
	const [hovered, setHovered] = useState<string | null>(null);
	const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
	const grid = useRef<HTMLTableElement>(null);
	const month = focused.slice(0, 7);
	const first = `${month}-01`;
	const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
	const now = today();

	// Moving on from the start to the end keeps the calendar open and puts focus on the end
	const lastMode = useRef(mode);
	useEffect(() => {
		if (mode !== lastMode.current) setFocused((end && end >= start ? end : start) || today());
		lastMode.current = mode;
	}, [mode, start, end]);

	// Keep keyboard focus on the focused day as it moves, across months too
	const moved = useRef(false);
	useEffect(() => {
		grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus({ preventScroll: !moved.current });
		moved.current = true;
	}, [focused]);

	const go = (date: string) => {
		if (date.slice(0, 7) !== month) setDirection(date > focused ? 'next' : 'prev');
		setFocused(date);
	};
	const disabled = (date: string) => mode === 'end' && Boolean(start) && date < start;

	const onKeyDown = (e: KeyboardEvent) => {
		const moves: Record<string, () => string> = {
			ArrowLeft: () => addDays(focused, -1),
			ArrowRight: () => addDays(focused, 1),
			ArrowUp: () => addDays(focused, -7),
			ArrowDown: () => addDays(focused, 7),
			Home: () => addDays(focused, -weekday(focused)),
			End: () => addDays(focused, 6 - weekday(focused)),
			PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
			PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
		};
		if (moves[e.key]) {
			e.preventDefault();
			go(moves[e.key]());
		}
	};

	// The range to draw: the chosen one, or start to the pointer while the end is being picked
	const rangeEnd = mode === 'end' && hovered && start && hovered >= start ? hovered : end;
	const lo = start && rangeEnd ? (start < rangeEnd ? start : rangeEnd) : start;
	const hi = start && rangeEnd ? (start < rangeEnd ? rangeEnd : start) : start;

	const cells: (string | null)[] = [...Array(weekday(first)).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
	// Always six weeks, so the calendar keeps its height from month to month
	while (cells.length < 42) cells.push(null);
	const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

	return (
		<div
			role="dialog"
			aria-label={mode === 'start' ? 'Choose the start date' : 'Choose the end date'}
			// Escape closes from anywhere in it, the month buttons included
			onKeyDown={(e) => {
				if (e.key !== 'Escape') return;
				e.preventDefault();
				onClose();
			}}
			data-popover
			className="flex w-full flex-col gap-3 rounded-xl border border-line bg-white p-3 shadow-[0_9px_30px_rgb(17_45_78/0.14)] md:p-4"
		>
			<div className="flex items-center justify-between">
				<button type="button" aria-label="Previous month" onClick={() => go(addMonths(focused, -1))} className="flex size-9 items-center justify-center rounded-md hover:bg-light-blue/60">
					<img src={chevron} alt="" width={18} height={18} className="rotate-90" />
				</button>
				<p aria-live="polite" className="font-display text-base">
					{format(first, { month: 'long', year: 'numeric' })}
				</p>
				<button type="button" aria-label="Next month" onClick={() => go(addMonths(focused, 1))} className="flex size-9 items-center justify-center rounded-md hover:bg-light-blue/60">
					<img src={chevron} alt="" width={18} height={18} className="-rotate-90" />
				</button>
			</div>

			<table ref={grid} role="grid" aria-label={format(first, { month: 'long', year: 'numeric' })} onKeyDown={onKeyDown} className="w-full table-fixed border-collapse">
				<thead>
					<tr>
						{['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
							<th key={d} scope="col" className="pb-1 text-xs leading-normal font-bold tracking-normal text-med-blue">
								<abbr title={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]} className="no-underline">
									{d}
								</abbr>
							</th>
						))}
					</tr>
				</thead>
				{/* Keyed by month, so a new month slides in from the side it came from (index.css) */}
				<tbody key={month} data-calendar-month={direction ?? undefined}>
					{weeks.map((week, w) => (
						<tr key={w}>
							{week.map((date, i) => {
								if (!date) return <td key={i} className="h-10 md:h-11" />;
								const ends = date === lo || date === hi;
								const between = Boolean(lo && hi) && date > lo && date < hi;
								const span = lo !== hi;
								return (
									<td key={date} className="relative p-0 py-0.5">
										{/* The band joining start to end: half a cell at each end, rounded at the week's edges */}
										{span && (between || ends) && (
											<span
												aria-hidden="true"
												className={`absolute inset-y-0.5 bg-light-blue ${date === lo ? 'right-0 left-1/2' : date === hi ? 'right-1/2 left-0' : 'inset-x-0'} ${
													between && i === 0 ? 'rounded-l-full' : ''
												} ${between && i === 6 ? 'rounded-r-full' : ''}`}
											/>
										)}
										<button
											type="button"
											data-date={date}
											tabIndex={date === focused ? 0 : -1}
											// Unavailable days stay focusable, so arrow keys never stall on them
											aria-disabled={disabled(date) || undefined}
											aria-label={format(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '')}
											aria-pressed={date === start || date === end}
											aria-current={date === now ? 'date' : undefined}
											onClick={() => !disabled(date) && onPick(date)}
											onFocus={() => setFocused(date)}
											onMouseEnter={() => setHovered(date)}
											onMouseLeave={() => setHovered(null)}
											className={`relative mx-auto flex size-9 items-center justify-center rounded-full text-sm leading-none tabular-nums md:size-10 ${
												ends
													? 'bg-dark-blue font-bold text-off-white'
													: disabled(date)
														? 'cursor-not-allowed text-dark-blue/25'
														: 'text-dark-blue hover:bg-light-blue/70'
											}`}
										>
											{Number(date.slice(8))}
											{/* Today: a small dot under the number */}
											{date === now && (
												<span aria-hidden="true" className={`absolute bottom-1 size-1 rounded-full ${ends ? 'bg-off-white' : 'bg-med-blue'}`} />
											)}
										</button>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>

			<div className="flex items-center justify-between gap-3 border-t border-light-blue pt-3">
				<p className="text-sm leading-normal text-med-blue">{mode === 'start' ? 'Pick the start date' : 'Pick the end date'}</p>
				<button type="button" onClick={() => go(now)} className="shrink-0 rounded-md px-2 py-1 text-sm leading-normal font-bold text-dark-blue hover:bg-light-blue/60">
					Today
				</button>
			</div>
		</div>
	);
}
