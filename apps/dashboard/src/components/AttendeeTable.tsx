import { buttonClass } from '@checkpad/shared/button';
import { formatClockTime } from '@checkpad/shared/format';
import { useEffect, useRef, useState } from 'react';
import more from '../assets/more.svg';
import trash from '../assets/trash.svg';
import undo from '../assets/undo.png';
import { myEmail } from '../lib/auth';
import { checkIn, undoCheckIn } from '../lib/checkIn';
import type { DashboardEvent } from '../lib/events';
import { useCanEditEvents } from '../lib/organisers';
import type { RosterAttendee } from '../lib/roster';
import { useIsDesktop } from '../lib/useMediaQuery';
import Menu from './Menu';
import RemoveWalkInDialog from './RemoveWalkInDialog';

interface Props {
	event: DashboardEvent;
	attendees: RosterAttendee[];
}

// The page shows Figma's empty states instead of an empty table. Phones leave out the ticket
// column (search still finds tickets) to give names room.
export default function AttendeeTable({ event, attendees }: Props) {
	// Organisers remove any walk-in; staff only the ones they added (firestore.rules)
	const canEdit = useCanEditEvents();
	const me = myEmail();
	const canRemove = (a: RosterAttendee) => a.walkIn && (canEdit || a.addedBy === me);
	const desktop = useIsDesktop();
	return (
		<div className="rounded-2xl bg-white px-4 py-5 md:px-6">
			<table className="w-full table-fixed">
				<colgroup>
					<col />
					{desktop && <col className="w-[165px]" />}
					<col className="w-[112px]" />
					<col className={desktop ? 'w-[42px]' : 'w-[30px]'} />
				</colgroup>
				<thead>
					<tr className="text-left font-display text-sm text-black">
						<th className="pr-2 pb-2">Attendee</th>
						{desktop && <th className="pr-2 pb-2">Ticket</th>}
						<th className="pb-2">Action</th>
						<th className="pb-2">
							<span className="sr-only">Options</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{attendees.map((attendee) => (
						<AttendeeRow key={attendee.id} event={event} attendee={attendee} removable={canRemove(attendee)} showTicket={desktop} />
					))}
				</tbody>
			</table>
		</div>
	);
}

function AttendeeRow({ event, attendee, removable, showTicket }: { event: DashboardEvent; attendee: RosterAttendee; removable: boolean; showTicket: boolean }) {
	const { timeZone } = event;
	const name = `${attendee.firstName} ${attendee.lastName}`;
	const initials = `${attendee.firstName[0] ?? ''}${attendee.lastName[0] ?? ''}`.toUpperCase();
	const [removing, setRemoving] = useState(false);

	// The action button swaps between "Check in" and undo; keep keyboard focus on it.
	const actionRef = useRef<HTMLButtonElement>(null);
	const refocus = useRef(false);
	useEffect(() => {
		if (refocus.current) actionRef.current?.focus();
		refocus.current = false;
	}, [attendee.checkedInAt]);
	const toggle = (checkingIn: boolean) => {
		refocus.current = true;
		// Checking in confirms with a toast that offers Undo (Figma "Toast – checked in")
		if (checkingIn) checkIn(event, attendee);
		else undoCheckIn(event, attendee);
	};

	return (
		<tr>
			<td className="py-1.5 pr-2">
				<div className="flex items-center gap-2 py-0.5">
					<span
						aria-hidden="true"
						className="flex size-8 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-xs leading-none"
					>
						{initials}
					</span>
					<div className="flex min-w-0 flex-col gap-0.5 px-2 text-black">
						<p className="truncate font-display text-base">{name}</p>
						<p className="truncate text-xs">{attendee.email}</p>
					</div>
				</div>
			</td>
			{showTicket && (
				<td className="py-1.5 pr-2 font-mono text-xs text-black">
					{/* Walk-ins added before tickets were numbered have none */}
					{attendee.ticket ?? <span className="font-sans text-med-blue">Walk-in</span>}
				</td>
			)}
			<td className="py-1.5">
				{attendee.checkedInAt ? (
					<div className="flex items-center justify-end gap-3">
						<p className="flex flex-col items-end text-xs">
							<span className="font-bold">Arrived</span>
							<span className="text-med-blue">{formatClockTime(attendee.checkedInAt, timeZone)}</span>
						</p>
						<button
							ref={actionRef}
							type="button"
							aria-label={`Undo check-in for ${name}`}
							title="Undo check-in"
							onClick={() => toggle(false)}
							className="rounded p-0.5 hover:bg-light-blue/60"
						>
							{/* Cropped exactly as in the Figma file */}
							<span className="relative block h-[20.25px] w-[22.5px] overflow-hidden">
								<img src={undo} alt="" className="absolute top-[-20.37%] left-[-3.33%] h-[129.63%] w-[116.67%] max-w-none" />
							</span>
						</button>
					</div>
				) : (
					<button
						ref={actionRef}
						type="button"
						aria-label={`Check in ${name}`}
						onClick={() => toggle(true)}
						className={`${buttonClass('primary', 'sm')} whitespace-nowrap`}
					>
						Check in
					</button>
				)}
			</td>
			{/* Not in Figma: the toast's Undo is the only other way to take a walk-in off the list */}
			<td className="py-1.5 pl-1 text-right md:pl-3">
				{removable && (
					<Menu
						label={`Options for ${name}`}
						buttonClassName="rounded-md p-1 hover:bg-light-blue/60"
						items={[{ label: 'Remove walk-in', icon: trash, onSelect: () => setRemoving(true) }]}
					>
						<img src={more} alt="" width={18} height={18} />
					</Menu>
				)}
				{removing && <RemoveWalkInDialog event={event} attendee={attendee} onClose={() => setRemoving(false)} />}
			</td>
		</tr>
	);
}
