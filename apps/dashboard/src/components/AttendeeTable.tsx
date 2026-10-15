import { buttonClass } from '@checkpad/shared/button';
import { formatClockTime } from '@checkpad/shared/format';
import { useEffect, useRef } from 'react';
import undo from '../assets/undo.png';
import type { RosterAttendee } from '../lib/mock';
import { setCheckedIn } from '../lib/roster';

interface Props {
	eventSlug: string;
	timeZone: string;
	attendees: RosterAttendee[];
	query: string;
}

export default function AttendeeTable({ eventSlug, timeZone, attendees, query }: Props) {
	return (
		<div className="rounded-[15px] bg-white px-[22.5px] py-[18px]">
			<table className="w-full table-fixed">
				<colgroup>
					<col />
					<col className="w-[165px]" />
					<col className="w-[106px]" />
				</colgroup>
				<thead>
					<tr className="text-left font-display text-[15px] text-black">
						<th className="pr-2 pb-[7.5px]">Attendee</th>
						<th className="pr-2 pb-[7.5px]">Ticket</th>
						<th className="pb-[7.5px]">Action</th>
					</tr>
				</thead>
				<tbody>
					{attendees.map((attendee) => (
						<AttendeeRow key={attendee.id} eventSlug={eventSlug} timeZone={timeZone} attendee={attendee} />
					))}
					{attendees.length === 0 && (
						<tr>
							{/* Not in the design */}
							<td colSpan={3} className="py-6 text-center text-[15px] text-med-blue">
								{query ? `No attendees match “${query}”` : 'No attendees yet'}
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function AttendeeRow({ eventSlug, timeZone, attendee }: { eventSlug: string; timeZone: string; attendee: RosterAttendee }) {
	const name = `${attendee.firstName} ${attendee.lastName}`;
	const initials = `${attendee.firstName[0] ?? ''}${attendee.lastName[0] ?? ''}`.toUpperCase();

	// The action button swaps between "Check in" and undo; keep keyboard focus on it.
	const actionRef = useRef<HTMLButtonElement>(null);
	const refocus = useRef(false);
	useEffect(() => {
		if (refocus.current) actionRef.current?.focus();
		refocus.current = false;
	}, [attendee.checkedInAt]);
	const toggle = (checkedInAt: Date | null) => {
		refocus.current = true;
		setCheckedIn(eventSlug, attendee.id, checkedInAt);
	};

	return (
		<tr>
			<td className="py-[7.5px] pr-2">
				<div className="flex items-center gap-[7.5px] py-[3px]">
					<span
						aria-hidden="true"
						className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-[15px] leading-[15px]"
					>
						{initials}
					</span>
					<div className="flex min-w-0 flex-col gap-[3px] px-[7.5px] text-black">
						<p className="truncate font-display text-lg">{name}</p>
						<p className="truncate text-[15px]">{attendee.email}</p>
					</div>
				</div>
			</td>
			<td className="py-[7.5px] pr-2 font-mono text-[15px] text-black">
				{/* Not in the design: walk-ins have no ticket number */}
				{attendee.ticket ?? <span className="font-sans text-med-blue">Walk-in</span>}
			</td>
			<td className="py-[7.5px]">
				{attendee.checkedInAt ? (
					<div className="flex items-center justify-end gap-3">
						<p className="flex flex-col items-end text-[15px]">
							<span className="font-bold">Arrived</span>
							<span className="text-med-blue">{formatClockTime(attendee.checkedInAt, timeZone)}</span>
						</p>
						<button
							ref={actionRef}
							type="button"
							aria-label={`Undo check-in for ${name}`}
							title="Undo check-in"
							onClick={() => toggle(null)}
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
						onClick={() => toggle(new Date())}
						className={buttonClass('primary', 'sm')}
					>
						Check in
					</button>
				)}
			</td>
		</tr>
	);
}
