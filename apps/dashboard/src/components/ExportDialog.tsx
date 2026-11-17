import { buttonClass } from '@checkpad/shared/button';
import { useState } from 'react';
import x from '../assets/x.svg';
import { exportAttendance, exportForBevy } from '../lib/attendeeExport';
import type { DashboardEvent } from '../lib/events';
import Dialog from './Dialog';

// One "Export attendees" in the event's ⋮ menus (its header, and its card or row on Events), in
// place of an item per format: the two CSVs, each with what it's for, and Download.
const formats = [
	{
		id: 'bevy',
		label: 'For Bevy',
		note: 'In Bevy’s bulk-upload columns, walk-ins included, to record who came.',
		run: exportForBevy,
	},
	{
		id: 'attendance',
		label: 'Attendance record',
		note: 'Who registered and who came, with their answers to the registration questions. For Luma or any other platform.',
		run: exportAttendance,
	},
] as const;

export default function ExportDialog({ event, onClose }: { event: DashboardEvent; onClose: () => void }) {
	const [format, setFormat] = useState<(typeof formats)[number]['id']>('bevy');
	return (
		<Dialog
			title="Export attendees"
			description={`Download ${event.name}’s attendee list as a CSV.`}
			onClose={onClose}
			className="w-[450px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<form
				className="flex flex-col gap-5"
				onSubmit={(e) => {
					e.preventDefault();
					formats.find((f) => f.id === format)!.run(event);
					onClose();
				}}
			>
				<fieldset className="flex flex-col gap-2">
					<legend className="sr-only">Format</legend>
					{formats.map((f) => (
						<label
							key={f.id}
							className="flex cursor-pointer items-start gap-3 rounded-lg bg-off-white px-4 py-3 leading-normal outline-2 -outline-offset-2 outline-transparent transition-colors has-checked:bg-light-blue/40 has-checked:outline-med-blue has-focus-visible:outline-med-blue"
						>
							<input
								type="radio"
								name="format"
								value={f.id}
								checked={format === f.id}
								onChange={() => setFormat(f.id)}
								data-autofocus={format === f.id || undefined}
								className="mt-1 size-4 shrink-0 accent-dark-blue focus-visible:outline-none"
							/>
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="text-sm font-bold">{f.label}</span>
								<span className="text-xs text-med-blue">{f.note}</span>
							</span>
						</label>
					))}
				</fieldset>
				<div className="flex justify-end gap-3">
					<button type="button" onClick={onClose} className={buttonClass('secondary')}>
						Cancel
					</button>
					<button type="submit" className={buttonClass('primary')}>
						Download
					</button>
				</div>
			</form>
		</Dialog>
	);
}
