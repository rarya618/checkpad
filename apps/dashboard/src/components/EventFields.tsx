import { countries } from '@checkpad/shared/countries';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { endsNextDay, formTimesError, isMultiDay, nextDay, shiftedEndDate, ticketUrlError, timeZoneLabel, withOwner, type EventForm } from '../lib/eventForm';
import { ownsEvent, type DashboardEvent } from '../lib/events';
import type { Organiser } from '../lib/organisers';
import { teamName, type Team } from '../lib/teams';
import { DateTrigger, RangeCalendar } from './DatePicker';
import { SelectField, TextField } from './Field';
import { SwitchRow } from './Switch';

type Update = <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;

/** Where the calendar sits in the date fields' box: under its field, or above it once measured. */
type Place = { top?: number; bottom?: number; settled: boolean };

/** The nearest ancestor that scrolls, or the page itself. */
function scrollParent(el: HTMLElement) {
	for (let node = el.parentElement; node; node = node.parentElement) {
		if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node !== document.body && node !== document.documentElement) return node;
	}
	return document.scrollingElement ?? document.documentElement;
}

// When it starts and ends, then the time zone: shared by New event ("When") and Event settings
// ("Details"). An event is a single day, one date and two times, unless "Multi-day event" is
// on, which gives the start and the end a date each; those open one calendar that picks the
// start day, then the end day (DatePicker). One that ends at or before its start time on the
// same date runs past midnight, and the end says so.
export function DateTimeFields({ form, update }: { form: EventForm; update: Update }) {
	const [multiDay, setMultiDay] = useState(() => isMultiDay(form));
	// A single day keeps no end date of its own: the times alone say whether it runs past midnight
	const pastMidnight = multiDay ? endsNextDay(form) : Boolean(form.start && form.end) && form.end <= form.start;
	const [picking, setPicking] = useState<'single' | 'start' | 'end' | null>(null);
	// The field that opened the calendar, which it stays under while it moves on from the start
	// to the end, so it doesn't jump a row mid-pick
	const [anchor, setAnchor] = useState<'start' | 'end'>('start');
	const [place, setPlace] = useState<Place | null>(null);
	const room = useRef({ below: 0, above: 0, bottom: 0 });
	const area = useRef<HTMLDivElement>(null);
	const popover = useRef<HTMLDivElement>(null);
	const grid = useRef<HTMLDivElement>(null);
	const before = useRef<DOMRect[] | null>(null);
	const startButton = useRef<HTMLButtonElement>(null);
	const endButton = useRef<HTMLButtonElement>(null);
	const endDate = form.endDate || form.date;

	const open = (mode: 'single' | 'start' | 'end', from: 'start' | 'end') => {
		if (picking && anchor === from) return setPicking(null);
		setAnchor(from);
		setPlace(null);
		setPicking(mode);
	};
	const close = (focusField = true) => {
		if (focusField) (anchor === 'end' ? endButton : startButton).current?.focus();
		setPicking(null);
	};

	// Right under the field that opened it, 8px clear, measured before paint so it never shows
	// in the wrong place. Where that would hang off the end of the page, making it longer while
	// the calendar is open and jumping back when it closes, it opens above the field instead,
	// if the page has the room there. Then the page scrolls just enough to show it all. It's
	// placed once each time it opens, not again as it moves on from the start to the end.
	const isOpen = picking !== null;
	useLayoutEffect(() => {
		if (!isOpen || !area.current) return;
		const field = (anchor === 'end' ? endButton : startButton).current!.getBoundingClientRect();
		const box = area.current.getBoundingClientRect();
		const page = scrollParent(area.current);
		const pageTop = page.getBoundingClientRect().top - (page === document.scrollingElement ? 0 : page.scrollTop);
		room.current = { below: pageTop + page.scrollHeight - field.bottom, above: field.top - pageTop, bottom: box.bottom - field.top + 8 };
		setPlace({ top: field.bottom - box.top + 8, settled: false });
	}, [isOpen, anchor]);
	useLayoutEffect(() => {
		if (!place || place.settled || !popover.current) return;
		const needed = popover.current.offsetHeight + 8;
		const above = needed > room.current.below && needed <= room.current.above;
		setPlace(above ? { bottom: room.current.bottom, settled: true } : { ...place, settled: true });
	}, [place]);
	useEffect(() => {
		if (!place?.settled) return;
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		popover.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
	}, [place]);
	// A click anywhere else closes the calendar, leaving focus where the click put it; so does
	// moving focus out of it with Tab (the date fields toggle it themselves)
	useEffect(() => {
		if (!picking) return;
		const onDown = (e: PointerEvent) => {
			if (!area.current?.contains(e.target as Node)) setPicking(null);
		};
		document.addEventListener('pointerdown', onDown);
		return () => document.removeEventListener('pointerdown', onDown);
	}, [picking]);

	// A single day's end date follows its start, whichever of its fields changes
	const updateSingle = (key: 'date' | 'start' | 'end', value: string) => {
		update(key, value);
		const date = key === 'date' ? value : form.date;
		if (form.endDate !== date) update('endDate', date);
	};
	const setTime = (key: 'start' | 'end', value: string) => (multiDay ? update(key, value) : updateSingle(key, value));
	const toggleMultiDay = (on: boolean) => {
		// Where each field is now, mid-move included, for the rearranging below to start from
		if (grid.current) before.current = [...grid.current.children].map((el) => el.getBoundingClientRect());
		setPicking(null);
		setMultiDay(on);
		// Two days to start with; back to one, the end falls on the start date again
		if (!form.date) return;
		if (!on) update('endDate', form.date);
		else if (!isMultiDay(form)) update('endDate', nextDay(form.date));
	};

	// Switching between one day and several rearranges the same fields, so they travel to their
	// new places and sizes over 320ms on the quick ease-out: the date narrows as "Starts" moves up
	// beside it, "Ends" narrows towards the right, and the end date fades in where they made room
	// (and out, quicker, on the way back). With reduced motion nothing travels and the end date
	// only fades in.
	useLayoutEffect(() => {
		const was = before.current;
		before.current = null;
		if (!was || !grid.current || !area.current) return;
		const fields = [...grid.current.children] as HTMLElement[];
		for (const el of fields) for (const running of el.getAnimations()) running.cancel();
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const origin = area.current.getBoundingClientRect();
		fields.forEach((el, i) => {
			const from = was[i];
			if (el.contains(endButton.current)) {
				if (multiDay) el.animate({ opacity: [0, 1] }, { duration: 200, delay: reduced ? 0 : 120, easing: 'ease-out', fill: 'backwards' });
				else if (!reduced) {
					// Out of the layout already: held where it was while it fades
					const held = { visibility: 'visible', translate: `${from.left - origin.left}px ${from.top - origin.top}px`, width: `${from.width}px` };
					el.animate([{ ...held, opacity: 1 }, { ...held, opacity: 0 }], { duration: 120, easing: 'ease-out' });
				}
				return;
			}
			if (reduced) return;
			const to = el.getBoundingClientRect();
			if (from.left === to.left && from.top === to.top && from.width === to.width) return;
			el.animate(
				{ translate: [`${from.left - to.left}px ${from.top - to.top}px`, '0 0'], width: [`${from.width}px`, `${to.width}px`] },
				{ duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
			);
		});
	}, [multiDay]);

	const pick = (date: string) => {
		if (picking === 'single') {
			updateSingle('date', date);
			close();
		} else if (picking === 'start') {
			update('date', date);
			// The end date moves with it, keeping an event over several days the same length;
			// then the calendar asks for the end
			update('endDate', shiftedEndDate(form.endDate, form.date, date));
			setPicking('end');
		} else {
			update('endDate', date);
			close();
		}
	};

	return (
		<>
			{/* A single day: the date, then its two times side by side. Over several days: start
			    on one row and end on the next, each a date and a short time box. They're the same
			    fields either way, so they can move between the two (above); the end date sits out
			    of the layout, hidden, while the event is a single day. The calendar opens against
			    the date field that was clicked. */}
			<div ref={area} className="relative">
				<div ref={grid} className={`grid gap-3 ${multiDay ? 'grid-cols-[minmax(0,1fr)_6rem]' : 'grid-cols-2'}`}>
					<DateTrigger
						ref={startButton}
						label={multiDay ? 'Start date' : 'Date'}
						value={form.date}
						open={picking !== null && anchor === 'start'}
						onOpen={() => open(multiDay ? 'start' : 'single', 'start')}
						className={multiDay ? '' : 'col-span-2'}
					/>
					{/* Above the other fields, which it crosses on its way */}
					<TextField label="Starts" type="time" required value={form.start} onChange={(e) => setTime('start', e.target.value)} className="relative z-10 min-w-0" />
					<DateTrigger
						ref={endButton}
						label="End date"
						value={endDate}
						open={picking !== null && anchor === 'end'}
						onOpen={() => open(form.date ? 'end' : 'start', 'end')}
						hint={multiDay && pastMidnight ? 'Ends the next day, after midnight' : undefined}
						error={multiDay ? formTimesError(form) : null}
						className={multiDay ? '' : 'invisible absolute top-0 left-0'}
					/>
					<TextField
						label="Ends"
						type="time"
						required
						value={form.end}
						onChange={(e) => setTime('end', e.target.value)}
						hint={!multiDay && pastMidnight ? 'The next day, after midnight' : undefined}
						className="min-w-0 self-start"
					/>
				</div>
				{/* Mounted once its place is known, already visible, so focus can move into it */}
				{picking && place && (
					// Only as wide as the calendar, so the fields beside it stay clickable. The scroll
					// that shows it clears the page's sticky header and, on phones, the bottom nav;
					// above its field, it keeps the field in view underneath too.
					<div
						ref={popover}
						style={{ top: place.top, bottom: place.bottom }}
						data-side={place.bottom === undefined ? 'below' : 'above'}
						onBlur={(e) => {
							const to = e.relatedTarget;
							if (to && !e.currentTarget.contains(to) && to !== startButton.current && to !== endButton.current) setPicking(null);
						}}
						className={`absolute left-0 z-30 w-[min(100%,20.5rem)] scroll-mt-20 md:scroll-mt-32 ${
							place.bottom === undefined ? 'scroll-mb-28 md:scroll-mb-6' : 'scroll-mb-44 md:scroll-mb-20'
						}`}
					>
						<RangeCalendar mode={picking} start={form.date} end={multiDay ? endDate : form.date} onPick={pick} onClose={close} />
					</div>
				)}
			</div>
			<SwitchRow label="Multi-day event" note="It starts and ends on different dates" checked={multiDay} onChange={toggleMultiDay} />
			<SelectField label="Time zone" value={form.timeZone} onChange={(e) => update('timeZone', e.target.value)}>
				{countries.map((c) => (
					<optgroup key={c.code} label={c.name}>
						{c.timeZones.map((tz) => (
							<option key={tz.id} value={tz.id}>
								{timeZoneLabel(tz.id, form.date ? new Date(`${form.date}T12:00:00Z`) : undefined)}
							</option>
						))}
					</optgroup>
				))}
			</SelectField>
		</>
	);
}

// Where to get a ticket, for New event and Event settings (not in Figma). The check-in page
// offers it while check-in isn't open yet. A part-typed address ("lu") isn't wrong yet, so the
// error waits until you leave the field; saving waits for a whole one either way (formIsComplete).
export function TicketUrlField({ form, update }: { form: EventForm; update: Update }) {
	const [left, setLeft] = useState(false);
	return (
		<TextField
			label="Ticket link"
			type="url"
			inputMode="url"
			autoComplete="off"
			spellCheck={false}
			// As firestore.rules allows
			maxLength={500}
			value={form.ticketUrl}
			onChange={(e) => update('ticketUrl', e.target.value)}
			onBlur={() => setLeft(true)}
			placeholder="lu.ma/october-meetup"
			hint="Until check-in opens, the check-in link offers this for getting a ticket."
			error={left ? ticketUrlError(form) : null}
		/>
	);
}

type Teams = Pick<EventForm, 'ownerTeam' | 'otherTeams'>;

interface TeamFieldsProps {
	form: Teams;
	onChange: (teams: Teams) => void;
	teams: Team[];
	me: Organiser;
	/** Event settings: the saved event, whose owner decides who can change the teams. New event: none. */
	event?: DashboardEvent;
}

// The owner and the other teams that run the event, for New event and Event settings (not in
// Figma). Organisers of the owner team, and super admins, choose them; the other teams' organisers see them.
export function TeamFields({ form, onChange, teams, me, event }: TeamFieldsProps) {
	const name = (id: string) => teamName(teams, id);
	const canManage = event ? ownsEvent(me, event) : me.role !== 'team-member';

	if (!canManage) {
		const owner = event?.ownerTeamId;
		return (
			<div className="flex flex-col gap-1.5 leading-normal">
				<p className="text-sm">Teams</p>
				<p className="text-base">{[...(owner ? [`${name(owner)} (owner)`] : []), ...form.otherTeams.map(name)].join(', ') || 'None'}</p>
				{owner && <p className="text-sm text-med-blue">Only {name(owner)}’s organisers can change the teams.</p>}
			</div>
		);
	}

	// Organisers own what they create, and can hand an event only to a team already on it
	const ownerChoices =
		me.role === 'super-admin' ? teams : event ? teams.filter((t) => t.id === form.ownerTeam || form.otherTeams.includes(t.id)) : teams.filter((t) => t.id === me.teamId);
	const others = teams.filter((t) => t.id !== form.ownerTeam);
	const handedOn = event && form.ownerTeam !== (event.ownerTeamId ?? '');

	function toggle(id: string, on: boolean) {
		const next = new Set(form.otherTeams);
		if (on) next.add(id);
		else next.delete(id);
		onChange({ ownerTeam: form.ownerTeam, otherTeams: [...next].sort() });
	}

	return (
		<>
			<SelectField
				label="Owner"
				value={form.ownerTeam}
				onChange={(e) => onChange(withOwner(form, e.target.value))}
				hint={
					handedOn
						? `Once saved, only ${name(form.ownerTeam)}’s organisers can change the teams or delete the event.`
						: 'Its organisers choose the teams and can delete the event.'
				}
			>
				{ownerChoices.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</SelectField>
			{others.length > 0 && (
				<fieldset className="flex flex-col gap-1.5">
					<legend className="pb-1.5 text-sm leading-normal">Also run by</legend>
					{others.map((t) => (
						<label key={t.id} className="flex items-center gap-3 rounded-lg bg-off-white px-4 py-2.5 text-sm leading-normal">
							<input
								type="checkbox"
								checked={form.otherTeams.includes(t.id)}
								onChange={(e) => toggle(t.id, e.target.checked)}
								className="size-4 shrink-0 accent-dark-blue"
							/>
							{t.name}
						</label>
					))}
					<p className="text-sm leading-normal text-med-blue">
						Every team here sees and runs the event, and its team link points here while this is its next event.
					</p>
				</fieldset>
			)}
		</>
	);
}
