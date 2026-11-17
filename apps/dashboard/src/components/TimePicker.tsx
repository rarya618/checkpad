import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import clock from '../assets/clock.svg';
import { Field } from './Field';

// The event form's times, the date picker's partner (DatePicker.tsx): a field that reads as words
// ("5:30pm") and opens one list of times in 15-minute steps, the chosen one navy, so a time is a
// tap and never half typed. The end's list runs a full day round from the start, each time with
// how long the event would last ("8pm · 3 hrs"), so an evening past midnight follows on in order.
// A time off the steps (an older event's 6:10pm) keeps its place in the list, chosen.
// Times are wall-clock "HH:MM" strings, as the form keeps them.

const DAY = 24 * 60;
const STEP = 15;
const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const toTime = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** "5pm", "5:30pm", "12pm" (noon), "12am" (midnight): the 12-hour style of the event's header. */
export function timeLabel(time: string) {
	const minutes = toMinutes(time);
	const hour = Math.floor(minutes / 60);
	const minute = minutes % 60;
	return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''}${hour < 12 ? 'am' : 'pm'}`;
}

/** "45 min", "1 hr", "2 hrs 15 min". */
function durationLabel(minutes: number) {
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (!hours) return `${rest} min`;
	return `${hours} ${hours === 1 ? 'hr' : 'hrs'}${rest ? ` ${rest} min` : ''}`;
}

/** The same, said in full for a screen reader: "2 hours 15 minutes". */
const spokenDuration = (minutes: number) =>
	durationLabel(minutes)
		.replace(/\bhrs\b/, 'hours')
		.replace(/\bhr\b/, 'hour')
		.replace(/\bmin\b/, minutes % 60 === 1 ? 'minute' : 'minutes');

interface Option {
	time: string;
	/** Minutes after `from`, for the end's list. */
	after?: number;
}

/** Every step of the day, plus `value` if it's off them; from just after `from` round to it, if given. */
function options(value: string, from?: string): Option[] {
	const minutes = new Set(Array.from({ length: DAY / STEP }, (_, i) => i * STEP));
	if (value) minutes.add(toMinutes(value));
	if (!from) return [...minutes].sort((a, b) => a - b).map((m) => ({ time: toTime(m) }));
	const start = toMinutes(from);
	// Ending as it starts would be a whole day: only offered if that's what it already says
	if (!(value && toMinutes(value) === start)) minutes.delete(start);
	return [...minutes]
		.map((m) => ({ time: toTime(m), after: (m - start + DAY) % DAY || DAY }))
		.sort((a, b) => a.after - b.after);
}

interface Props {
	label: string;
	/** What the list's footer asks for: "start time", "end time". */
	prompt: string;
	value: string;
	onChange: (time: string) => void;
	/** The end's list: starts just after this time and shows each time's length from it. */
	from?: string;
	/** Which edge of the field the list lines up with: the end's, for a field in the right-hand column. */
	align?: 'start' | 'end';
	/** Opening it, so the form can close its calendar. */
	onOpen?: () => void;
	hint?: string;
	error?: string | null;
	className?: string;
}

/** A time field that opens the list: a filled box like the date fields, with the time in words. */
export function TimeField({ label, prompt, value, onChange, from, align = 'start', onOpen, hint, error, className = '' }: Props) {
	const [open, setOpen] = useState(false);
	const [above, setAbove] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);

	const close = (focusField = true) => {
		setOpen(false);
		if (focusField) trigger.current?.focus();
	};
	const toggle = () => {
		if (open) return close(false);
		// Below the field, unless that would run off the screen and there's room above
		const box = trigger.current!.getBoundingClientRect();
		setAbove(innerHeight - box.bottom < LIST_HEIGHT && box.top > LIST_HEIGHT + 64);
		onOpen?.();
		setOpen(true);
	};

	// A press anywhere else closes it, leaving focus where the press put it
	useEffect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('pointerdown', onDown);
		return () => document.removeEventListener('pointerdown', onDown);
	}, [open]);

	return (
		<Field label={label} hint={hint} error={error} className={`@container min-w-0 ${className}`}>
			{(control) => (
				<div ref={root} className="relative">
					<button
						ref={trigger}
						type="button"
						{...control}
						aria-haspopup="listbox"
						aria-expanded={open}
						onClick={toggle}
						onKeyDown={(e) => {
							if (e.key === 'ArrowDown' && !open) {
								e.preventDefault();
								toggle();
							}
						}}
						// Narrow beside a start date (6rem), so the clock gives way to the time
						className={`flex w-full items-center justify-between gap-3 rounded-lg bg-off-white px-3 py-3 text-left text-base leading-normal outline-none hover:bg-light-blue/50 focus-visible:outline-[1.5px] focus-visible:-outline-offset-[1.5px] focus-visible:outline-med-blue @[8rem]:px-5 ${
							open ? 'outline-[1.5px] -outline-offset-[1.5px] outline-med-blue' : ''
						}`}
					>
						<span className={`truncate tabular-nums ${value ? 'text-dark-blue' : 'text-dark-blue/30'}`}>{value ? timeLabel(value) : 'Choose a time'}</span>
						<img src={clock} alt="" width={18} height={18} className="hidden shrink-0 @[8rem]:block" />
					</button>
					{open && (
						<div
							data-side={above ? 'above' : 'below'}
							data-align={align}
							className={`absolute z-30 w-60 scroll-mt-20 md:scroll-mt-32 ${above ? 'bottom-full mb-2 scroll-mb-6' : 'top-full mt-2 scroll-mb-28 md:scroll-mb-6'} ${
								align === 'end' ? 'right-0' : 'left-0'
							}`}
							onBlur={(e) => {
								const to = e.relatedTarget;
								if (to && !e.currentTarget.contains(to) && to !== trigger.current) setOpen(false);
							}}
						>
							<TimeList
								label={label}
								prompt={prompt}
								value={value}
								from={from}
								onPick={(time) => {
									onChange(time);
									close();
								}}
								onClose={close}
							/>
						</div>
					)}
				</div>
			)}
		</Field>
	);
}

/** The list's own height: about seven times, then it scrolls. */
const LIST_HEIGHT = 320;

interface ListProps {
	label: string;
	prompt: string;
	value: string;
	from?: string;
	onPick: (time: string) => void;
	onClose: () => void;
}

/**
 * The times, opened with the chosen one in the middle and focused. Arrow keys move by 15 minutes,
 * Page Up and Down by an hour, Home and End to the list's ends; typing a time jumps to it ("6p",
 * "630"); Enter picks and Escape closes. On-the-hour times are bold, so the hours read at a glance.
 */
function TimeList({ label, prompt, value, from, onPick, onClose }: ListProps) {
	const list = options(value, from);
	// Where focus starts: the chosen time, or for an empty end an hour after the start
	const initial = Math.max(
		0,
		list.findIndex((o) => o.time === value),
	);
	const [focused, setFocused] = useState(value ? initial : from ? Math.min(3, list.length - 1) : 68);
	const box = useRef<HTMLDivElement>(null);
	const typed = useRef({ text: '', at: 0 });

	// Opens with the chosen time centred, the page scrolled just enough to show the whole list
	useLayoutEffect(() => {
		const row = box.current?.querySelector<HTMLElement>(`[data-index="${focused}"]`);
		if (box.current && row) box.current.scrollTop = row.offsetTop - box.current.clientHeight / 2 + row.offsetHeight / 2;
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		// The wrapper, whose scroll margins clear the sticky header and, on phones, the tab bar
		box.current?.closest('[data-side]')?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
	}, []);
	// Focus follows the focused time; the first time without scrolling, which the list just did
	const moved = useRef(false);
	useEffect(() => {
		box.current?.querySelector<HTMLElement>(`[data-index="${focused}"]`)?.focus({ preventScroll: !moved.current });
		moved.current = true;
	}, [focused]);

	const go = (index: number) => setFocused(Math.max(0, Math.min(list.length - 1, index)));
	const onKeyDown = (e: KeyboardEvent) => {
		const moves: Record<string, number> = {
			ArrowDown: focused + 1,
			ArrowUp: focused - 1,
			PageDown: focused + 4,
			PageUp: focused - 4,
			Home: 0,
			End: list.length - 1,
		};
		if (e.key in moves) {
			e.preventDefault();
			return go(moves[e.key]);
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			return onClose();
		}
		// Type-ahead on the words: "6" finds 6am (or the next 6 after the start), "6p" 6pm, "630" 6:30
		if (/^[\dapm:]$/i.test(e.key)) {
			const now = Date.now();
			const text = (now - typed.current.at < 800 ? typed.current.text : '') + e.key.toLowerCase().replace(':', '');
			typed.current = { text, at: now };
			const match = list.findIndex((o) => timeLabel(o.time).replace(':', '').startsWith(text));
			if (match >= 0) go(match);
		}
	};

	return (
		<div data-popover className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_9px_30px_rgb(17_45_78/0.14)]">
			<div
				ref={box}
				role="listbox"
				aria-label={label}
				onKeyDown={onKeyDown}
				style={{ maxHeight: LIST_HEIGHT - 48 }}
				className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain p-1.5"
			>
				{list.map((o, i) => {
					const chosen = o.time === value;
					const onTheHour = o.time.endsWith(':00');
					return (
						<button
							key={o.time}
							type="button"
							role="option"
							data-index={i}
							tabIndex={i === focused ? 0 : -1}
							aria-selected={chosen}
							aria-label={o.after ? `${timeLabel(o.time)}, ${spokenDuration(o.after)}` : undefined}
							onClick={() => onPick(o.time)}
							onFocus={() => setFocused(i)}
							className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm leading-normal tabular-nums outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-med-blue ${
								chosen ? 'bg-dark-blue text-off-white' : 'text-dark-blue hover:bg-light-blue/60'
							}`}
						>
							<span className={onTheHour || chosen ? 'font-bold' : ''}>{timeLabel(o.time)}</span>
							{o.after !== undefined && (
								<span aria-hidden="true" className={`text-xs ${chosen ? 'text-light-blue' : 'text-med-blue'}`}>
									{durationLabel(o.after)}
								</span>
							)}
						</button>
					);
				})}
			</div>
			<p className="border-t border-light-blue px-4 py-3 text-sm leading-normal text-med-blue">Pick the {prompt}</p>
		</div>
	);
}
