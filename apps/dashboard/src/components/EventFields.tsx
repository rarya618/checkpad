import { countries } from '@checkpad/shared/countries';
import { timeZoneLabel, type EventForm } from '../lib/eventForm';
import { SelectField, TextField } from './Field';

type Update = <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;

// Date, start and end on one row, then the time zone: shared by New event ("When")
// and Event settings ("Details").
export function DateTimeFields({ form, update }: { form: EventForm; update: Update }) {
	return (
		<>
			<div className="flex gap-3">
				<TextField
					label="Date"
					type="date"
					required
					value={form.date}
					onChange={(e) => update('date', e.target.value)}
					className="min-w-0 flex-1"
				/>
				<TextField
					label="Starts"
					type="time"
					required
					value={form.start}
					onChange={(e) => update('start', e.target.value)}
					className="w-[82.5px] shrink-0"
				/>
				<TextField
					label="Ends"
					type="time"
					required
					value={form.end}
					onChange={(e) => update('end', e.target.value)}
					className="w-[82.5px] shrink-0"
				/>
			</div>
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
