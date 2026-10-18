import { buttonClass } from '@checkpad/shared/button';
import { useState } from 'react';
import x from '../assets/x.svg';
import { deleteEvent, type DashboardEvent } from '../lib/events';
import { useRoster } from '../lib/roster';
import Dialog from './Dialog';
import { TextField } from './Field';

// Figma "Attendees – delete event". Typing the event name unlocks the delete button.
// Pages showing the deleted event redirect themselves (EventLayout), so this only deletes.
export default function DeleteEventDialog({ event, onClose }: { event: DashboardEvent; onClose: () => void }) {
	const attendees = useRoster(event.slug).length;
	const [confirm, setConfirm] = useState('');
	const matches = confirm.trim() === event.name.trim();

	return (
		<Dialog
			title={`Delete ${event.name}?`}
			description={`This deletes the event and all ${attendees} attendee${attendees === 1 ? '' : 's'}, including who checked in. It can’t be undone.`}
			onClose={onClose}
			className="w-[450px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<form
				className="flex flex-col gap-[18px]"
				onSubmit={(e) => {
					e.preventDefault();
					if (!matches) return;
					deleteEvent(event.slug);
					onClose();
				}}
			>
				<TextField
					label="Type the event name to confirm"
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					placeholder={event.name}
					autoComplete="off"
					data-autofocus
				/>
				<div className="flex justify-end gap-3">
					<button type="button" onClick={onClose} className={buttonClass('secondary')}>
						Cancel
					</button>
					<button type="submit" disabled={!matches} className={`${buttonClass('primary')} disabled:opacity-50`}>
						Delete event
					</button>
				</div>
			</form>
		</Dialog>
	);
}
