import { countries } from '@checkpad/shared/countries';
import { timeZoneLabel, withOwner, type EventForm } from '../lib/eventForm';
import { ownsEvent, type DashboardEvent } from '../lib/events';
import type { Organiser } from '../lib/organisers';
import { teamName, type Team } from '../lib/teams';
import { SelectField, TextField } from './Field';

type Update = <K extends keyof EventForm>(key: K, value: EventForm[K]) => void;

// Date, start and end on one row, then the time zone: shared by New event ("When")
// and Event settings ("Details").
export function DateTimeFields({ form, update }: { form: EventForm; update: Update }) {
	return (
		<>
			{/* One row when the card has room (384px, from its own width, not the window's): the date
			    then two short time boxes. Narrower, the date takes a row of its own, as it needs
			    about 160px, and the times share the row below. */}
			<div className="@container">
				<div className="grid grid-cols-2 gap-3 @sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
					<TextField
						label="Date"
						type="date"
						required
						value={form.date}
						onChange={(e) => update('date', e.target.value)}
						className="col-span-2 min-w-0 @sm:col-span-1"
					/>
					<TextField
						label="Starts"
						type="time"
						required
						value={form.start}
						onChange={(e) => update('start', e.target.value)}
						className="min-w-0"
					/>
					<TextField
						label="Ends"
						type="time"
						required
						value={form.end}
						onChange={(e) => update('end', e.target.value)}
						className="min-w-0"
					/>
				</div>
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
				{owner && <p className="text-xs text-med-blue">Only {name(owner)}’s organisers can change the teams.</p>}
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
					<p className="text-xs leading-normal text-med-blue">
						Every team here sees and runs the event, and its team link points here while this is its next event.
					</p>
				</fieldset>
			)}
		</>
	);
}
