import { buttonClass } from '@checkpad/shared/button';
import { useState, type FormEvent } from 'react';
import close from '../assets/close.svg';
import x from '../assets/x.svg';
import { addWalkInAndCheckIn, looksLikeEmail, walkInTicketPrefix } from '../lib/checkIn';
import type { DashboardEvent } from '../lib/events';
import { nextWalkInTicket, useRoster } from '../lib/roster';
import Dialog from './Dialog';
import { TextField } from './Field';

// Figma "Attendees – add walk-in" (desktop dialog) and "Staff check in (mobile) – add walk-in"
// (a card in place of the search). Both add the person already checked in.

function useWalkInForm(event: DashboardEvent, initialEmail: string, onDone: () => void) {
	const roster = useRoster(event.slug);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState(looksLikeEmail(initialEmail) ? initialEmail.trim() : '');
	const taken = roster.some((a) => a.email.toLowerCase() === email.trim().toLowerCase());
	const emailError = taken ? 'Someone with this email is already on the list. Find them instead.' : null;
	const valid = firstName.trim() !== '' && looksLikeEmail(email) && !taken;
	const ticket = nextWalkInTicket(roster, walkInTicketPrefix(event));

	function submit(e: FormEvent) {
		e.preventDefault();
		if (!valid) return;
		addWalkInAndCheckIn(event, { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
		onDone();
	}

	const fields = {
		firstName: { value: firstName, onChange: (e: { target: { value: string } }) => setFirstName(e.target.value), required: true, autoComplete: 'off' },
		lastName: { value: lastName, onChange: (e: { target: { value: string } }) => setLastName(e.target.value), autoComplete: 'off' },
		email: { value: email, onChange: (e: { target: { value: string } }) => setEmail(e.target.value), type: 'email', required: true, autoComplete: 'off', error: emailError },
	};
	return { fields, valid, ticket, submit };
}

/** "General admission · Google Sydney": the ticket title and the first part of the venue. */
function ticketDetails(event: DashboardEvent) {
	return [event.walkInTicketTitle, event.walkInVenue.split(',')[0]].filter(Boolean).join(' · ');
}

export function WalkInDialog({ event, initialEmail = '', onClose }: { event: DashboardEvent; initialEmail?: string; onClose: () => void }) {
	const { fields, valid, ticket, submit } = useWalkInForm(event, initialEmail, onClose);
	return (
		<Dialog
			title="Add walk-in"
			description="For someone who didn’t register. They’re checked in as soon as you add them."
			onClose={onClose}
			className="w-[450px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<form onSubmit={submit} className="flex flex-col gap-[18px]">
				<div className="flex gap-3">
					<TextField label="First name" {...fields.firstName} className="min-w-0 flex-1" data-autofocus />
					<TextField label="Last name" {...fields.lastName} className="min-w-0 flex-1" />
				</div>
				<TextField label="Email" {...fields.email} />
				<div className="flex items-center gap-3 rounded-[7.5px] bg-light-blue px-[18px] py-3 leading-[1.5]">
					<div className="flex min-w-0 flex-1 flex-col gap-[3px]">
						<p className="text-[13.5px] font-bold">Ticket</p>
						<p className="truncate text-xs text-med-blue">{ticketDetails(event)}</p>
					</div>
					<p className="shrink-0 font-mono text-[16.5px]">{ticket}</p>
				</div>
				<div className="flex justify-end gap-3">
					<button type="button" onClick={onClose} className={buttonClass('secondary')}>
						Cancel
					</button>
					<button type="submit" disabled={!valid} className={`${buttonClass('primary')} disabled:opacity-50`}>
						Add and check in
					</button>
				</div>
			</form>
		</Dialog>
	);
}

export function WalkInCard({ event, initialEmail = '', onClose }: { event: DashboardEvent; initialEmail?: string; onClose: () => void }) {
	const { fields, valid, ticket, submit } = useWalkInForm(event, initialEmail, onClose);
	return (
		<form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-med-blue bg-white p-5">
			<div className="flex items-center">
				<h2 className="min-w-0 flex-1 font-display text-[28px] leading-[1.2]">Add walk-in</h2>
				<button type="button" aria-label="Close" onClick={onClose} className="-m-1 shrink-0 rounded p-1 hover:bg-light-blue/60">
					<img src={close} alt="" width={28} height={28} />
				</button>
			</div>
			<TextField size="lg" label="First name" {...fields.firstName} autoFocus />
			<TextField size="lg" label="Last name" {...fields.lastName} />
			<TextField size="lg" label="Email" {...fields.email} />
			<div className="flex items-center gap-2.5 rounded-[10px] bg-light-blue px-4 py-3 leading-[1.5]">
				<p className="min-w-0 flex-1 text-base font-bold">Ticket</p>
				<p className="shrink-0 font-mono text-lg">{ticket}</p>
			</div>
			<button type="submit" disabled={!valid} className={`w-full ${buttonClass('primary', 'lg')} disabled:opacity-50`}>
				Add and check in
			</button>
		</form>
	);
}
