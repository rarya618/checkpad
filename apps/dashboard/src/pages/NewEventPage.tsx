import { buttonClass } from '@checkpad/shared/button';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DateTimeFields } from '../components/EventFields';
import { LinkField, SelectField, TextField } from '../components/Field';
import FormCard from '../components/FormCard';
import { SwitchRow } from '../components/Switch';
import { WEB_HOST } from '../lib/config';
import { cleanSlug, formIsComplete, formToInput, randomSuffix, selfWalkInsNote, suggestedSlug, type EventForm } from '../lib/eventForm';
import { createEvent, isSlugTaken } from '../lib/events';
import { useTeams, type Team } from '../lib/teams';
import { showToast } from '../lib/toast';

const blank: EventForm = {
	name: '',
	slug: '',
	description: '',
	date: '',
	start: '17:00',
	end: '20:00',
	timeZone: 'Australia/Sydney',
	team: '',
	walkInTicketTitle: 'General admission',
	walkInVenue: '',
	selfWalkIns: true,
	selfCheckInOpen: false,
};

// Figma "New event". Placeholders show the example values from the design.
export default function NewEventPage() {
	const navigate = useNavigate();
	const teams = useTeams() ?? [];
	const [form, setForm] = useState(() => ({ ...blank, team: teams[0]?.id ?? '' }));
	// The link follows the name until someone edits it by hand. A name another event
	// already uses gets a suffix, picked once so it doesn't change with every keystroke.
	const [slugEdited, setSlugEdited] = useState(false);
	const [suffix] = useState(randomSuffix);

	function update<K extends keyof EventForm>(key: K, value: EventForm[K]) {
		setForm((f) => {
			const next = { ...f, [key]: value };
			if (!slugEdited && key === 'name') next.slug = suggestedSlug(next.name, suffix);
			return next;
		});
	}

	const team: Team | undefined = teams.find((t) => t.id === form.team) ?? teams[0];
	const slug = form.slug.replace(/-+$/, '');
	const slugTaken = slug !== '' && isSlugTaken(slug);
	const [saving, setSaving] = useState(false);
	const canCreate = formIsComplete(form) && !slugTaken && team !== undefined && !saving;

	return (
		<form
			onSubmit={async (e) => {
				e.preventDefault();
				if (!canCreate) return;
				// Waits for the server: the event's pages can't read its attendees until it has the
				// event. The rules refuse a link another team's event has, which we can't see.
				setSaving(true);
				try {
					await createEvent(formToInput(form, slug));
					navigate(`/events/${slug}`);
				} catch {
					showToast(`Couldn’t create ${form.name.trim()}. Its link may be taken: try another, or check the connection.`);
					setSaving(false);
				}
			}}
		>
			{/* Sticks once 24px remains above it, like PageHeader */}
			<header className="sticky top-[-30px] z-10 flex items-end gap-3 bg-off-white px-6 pt-[54px] pb-[30px]">
				<div className="flex min-w-0 flex-1 flex-col gap-3.5">
					<nav aria-label="Breadcrumb">
						<ol className="flex items-center gap-1.5 text-[15px] text-black">
							<li>
								<Link to="/events" className="tracking-[-0.375px] hover:underline">
									Events
								</Link>
							</li>
							<li aria-hidden="true">/</li>
							<li aria-current="page" className="font-display">
								New event
							</li>
						</ol>
					</nav>
					<h1 className="font-display text-3xl">New event</h1>
				</div>
				<div className="flex shrink-0 items-center gap-[15px]">
					<Link to="/events" className={buttonClass('secondary')}>
						Cancel
					</Link>
					<button type="submit" disabled={!canCreate} className={`${buttonClass('primary')} disabled:opacity-50`}>
						Create event
					</button>
				</div>
			</header>

			<div className="grid gap-[18px] px-6 pb-[27px] lg:grid-cols-2">
				<div className="flex flex-col gap-[18px]">
					<FormCard title="Details">
						<TextField
							label="Name"
							required
							value={form.name}
							onChange={(e) => update('name', e.target.value)}
							placeholder="October Meetup"
							autoFocus
						/>
						<LinkField
							label="Link"
							host={WEB_HOST}
							required
							value={form.slug}
							onChange={(e) => {
								setSlugEdited(true);
								update('slug', cleanSlug(e.target.value));
							}}
							placeholder="october-meetup"
							hint="Attendees use this link to check in."
							error={slugTaken ? 'Another event already uses this link.' : null}
						/>
						<TextField
							label="Description"
							value={form.description}
							onChange={(e) => update('description', e.target.value)}
							placeholder="Join us for our monthly meetup"
						/>
					</FormCard>
					<FormCard title="When">
						<DateTimeFields form={form} update={update} />
					</FormCard>
				</div>
				<div className="flex flex-col gap-[18px]">
					<FormCard title="Team" description="Team members can see and run this event. Super admins see every event.">
						<SelectField
							label="Team"
							value={form.team}
							onChange={(e) => update('team', e.target.value)}
							hint={team ? `${WEB_HOST}/team/${team.slug} will point here while this is the team’s next event.` : 'Add a team on the Organisers page first.'}
						>
							{teams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</SelectField>
					</FormCard>
					<FormCard
						title="Walk-ins"
						description={`Walk-ins get the next ticket number: ${team?.walkInTicketPrefix ?? ''}0001, ${team?.walkInTicketPrefix ?? ''}0002, and so on. Staff can always add them.`}
						className="flex-1"
					>
						<TextField
							label="Ticket title"
							value={form.walkInTicketTitle}
							onChange={(e) => update('walkInTicketTitle', e.target.value)}
							placeholder="General admission"
						/>
						<TextField
							label="Venue"
							value={form.walkInVenue}
							onChange={(e) => update('walkInVenue', e.target.value)}
							placeholder="Google Sydney, 1 Pirrama Rd, Pyrmont"
						/>
						<SwitchRow
							label="Attendees can add themselves"
							note={selfWalkInsNote(form.selfWalkIns)}
							checked={form.selfWalkIns}
							onChange={(on) => update('selfWalkIns', on)}
						/>
					</FormCard>
				</div>
			</div>
		</form>
	);
}
