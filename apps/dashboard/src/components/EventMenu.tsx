import { useState } from 'react';
import download from '../assets/download.svg';
import ellipsis from '../assets/ellipsis-vertical.svg';
import link from '../assets/link.svg';
import sliders from '../assets/sliders.svg';
import trash from '../assets/trash.svg';
import { exportAttendance, exportForBevy } from '../lib/attendeeExport';
import { checkInUrl } from '../lib/config';
import { ownsEvent, type DashboardEvent } from '../lib/events';
import { useCanEditEvents, useMe } from '../lib/organisers';
import { showToast } from '../lib/toast';
import DeleteEventDialog from './DeleteEventDialog';
import Menu from './Menu';

/**
 * Figma "Events – card menu", on the Events page's cards and rows. relative lifts it above the
 * stretched link that opens the event; a 44px target on phones.
 */
export default function EventMenu({ event, className = '' }: { event: DashboardEvent; className?: string }) {
	const canEdit = useCanEditEvents();
	const canDelete = ownsEvent(useMe(), event);
	const [deleting, setDeleting] = useState(false);
	return (
		<div className={`relative shrink-0 ${className}`}>
			<Menu
				label={`Options for ${event.name}`}
				buttonClassName="flex size-11 items-center justify-center rounded-md hover:bg-light-blue/60 md:size-8"
				items={[
					...(canEdit ? [{ label: 'Settings', icon: sliders, to: `/events/${event.slug}/settings` }] : []),
					{
						label: 'Copy check-in link',
						icon: link,
						onSelect: () => navigator.clipboard.writeText(checkInUrl(event.slug)).then(() => showToast('Check-in link copied')),
					},
					{ label: 'Export for Bevy', icon: download, onSelect: () => exportForBevy(event) },
					{ label: 'Export attendance (CSV)', icon: download, onSelect: () => exportAttendance(event) },
					...(canDelete ? [{ label: 'Delete event', icon: trash, separated: true, onSelect: () => setDeleting(true) }] : []),
				]}
			>
				<img src={ellipsis} alt="" width={18} height={18} />
			</Menu>
			{deleting && <DeleteEventDialog event={event} onClose={() => setDeleting(false)} />}
		</div>
	);
}
