import { buttonClass } from '@checkpad/shared/button';
import x from '../assets/x.svg';
import { fullName, removeWalkIn } from '../lib/checkIn';
import type { DashboardEvent } from '../lib/events';
import type { RosterAttendee } from '../lib/roster';
import Dialog from './Dialog';

// Remove walk-in (not in Figma), from a walk-in's menu in the attendee table. Focus starts on
// Cancel, since removing can't be undone and loses the record that they came.
export default function RemoveWalkInDialog({ event, attendee, onClose }: { event: DashboardEvent; attendee: RosterAttendee; onClose: () => void }) {
	const name = fullName(attendee);
	return (
		<Dialog
			title={`Remove ${name}?`}
			description={`This takes walk-in ${attendee.ticket} off the list and out of the counts. Adding them again gives them a new ticket number. It can’t be undone.`}
			onClose={onClose}
			className="w-[450px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					removeWalkIn(event, attendee);
					onClose();
				}}
			>
				<div className="flex justify-end gap-3">
					<button type="button" onClick={onClose} className={buttonClass('secondary')} data-autofocus>
						Cancel
					</button>
					<button type="submit" className={buttonClass('primary')}>
						Remove walk-in
					</button>
				</div>
			</form>
		</Dialog>
	);
}
