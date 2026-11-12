import { buttonClass } from '@checkpad/shared/button';
import { teamTimeZone } from '@checkpad/shared/countries';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DateTimeFields, TeamFields } from '../components/EventFields';
import { LinkField, TextAreaField, TextField } from '../components/Field';
import FormCard from '../components/FormCard';
import { SwitchRow } from '../components/Switch';
import { WEB_HOST } from '../lib/config';
import { cleanSlug, formIsComplete, formToInput, randomSuffix, selfWalkInsNote, suggestedSlug, type EventForm } from '../lib/eventForm';
import { createEvent, isSlugTaken } from '../lib/events';
import { useMe } from '../lib/organisers';
import { useTeams, WALK_IN_PREFIX, type Team } from '../lib/teams';
import { useIsDesktop } from '../lib/useMediaQuery';
import { showToast } from '../lib/toast';

const blank: EventForm = {
	name: '',
	slug: '',
	description: '',
	date: '',
	start: '17:00',
	end: '20:00',
	timeZone: '',
	ownerTeam: '',
	otherTeams: [],
	walkInTicketTitle: 'General admission',
	walkInVenue: '',
	selfWalkIns: true,
	selfCheckInOpen: false,
};

// Figma "New event". Placeholders show the example values from the design.
export default function NewEventPage() {
	const navigate = useNavigate();
	const teams = useTeams() ?? [];
	const me = useMe();
	// Your own team; super admins start with the first
	const [form, setForm] = useState(() => {
		const team = teams.find((t) => t.id === me.teamId) ?? teams[0];
		return { ...blank, ownerTeam: team?.id ?? '', timeZone: teamTimeZone(team) };
	});
	// The link follows the name until someone edits it by hand. A name another event
	// already uses gets a suffix, picked once so it doesn't change with every keystroke.
	const [slugEdited, setSlugEdited] = useState(false);
	const [suffix] = useState(randomSuffix);
	// The time zone follows the team's until someone picks one
	const [timeZoneEdited, setTimeZoneEdited] = useState(false);

	function update<K extends keyof EventForm>(key: K, value: EventForm[K]) {
		if (key === 'timeZone') setTimeZoneEdited(true);
		setForm((f) => {
			const next = { ...f, [key]: value };
			if (!slugEdited && key === 'name') next.slug = suggestedSlug(next.name, suffix);
			if (!timeZoneEdited && key === 'ownerTeam') next.timeZone = teamTimeZone(teams.find((t) => t.id === value));
			return next;
		});
	}

	const team: Team | undefined = teams.find((t) => t.id === form.ownerTeam);
	const slug = form.slug.replace(/-+$/, '');
	const slugTaken = slug !== '' && isSlugTaken(slug);
	const [saving, setSaving] = useState(false);
	const canCreate = formIsComplete(form) && !slugTaken && team !== undefined && !saving;
	const desktop = useIsDesktop();
	const buttons = (
		<div className="flex shrink-0 items-center gap-4">
			<Link to="/events" className={buttonClass('secondary')}>
				Cancel
			</Link>
			<button type="submit" disabled={!canCreate} className={`${buttonClass('primary')} disabled:opacity-50`}>
				Create event
			</button>
		</div>
	);

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
			<header className="flex items-end gap-3 bg-off-white px-6 pt-3 md:sticky md:top-[-30px] md:z-10 md:pt-14 md:pb-4">
				<div className="flex min-w-0 flex-1 flex-col gap-3.5">
					<nav aria-label="Breadcrumb">
						<ol className="flex items-center gap-1.5 text-sm text-black">
							<li>
								<Link to="/events" className="tracking-tight hover:underline">
									Events
								</Link>
							</li>
							<li aria-hidden="true">/</li>
							<li aria-current="page" className="font-display">
								New event
							</li>
						</ol>
					</nav>
					<h1 className="font-display text-2xl md:text-3xl">New event</h1>
				</div>
				{desktop && buttons}
			</header>
			{/* Phones: only the buttons stick, on their own row, while the title scrolls away */}
			{!desktop && <div className="sticky top-0 z-10 bg-off-white px-6 pt-3 pb-4">{buttons}</div>}

			<div className="grid grid-cols-1 gap-5 px-6 pt-4 pb-7 lg:grid-cols-2">
				<div className="flex flex-col gap-5">
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
						<TextAreaField
							label="Description"
							// As firestore.rules allows
							maxLength={500}
							value={form.description}
							onChange={(e) => update('description', e.target.value)}
							placeholder="Join us for our monthly meetup"
						/>
					</FormCard>
					<FormCard title="When">
						<DateTimeFields form={form} update={update} />
					</FormCard>
				</div>
				<div className="flex flex-col gap-5">
					<FormCard title="Teams" description="Members of its teams see and run this event. Super admins see every event.">
						{team ? (
							<TeamFields
								form={form}
								onChange={(teams) => {
									if (teams.ownerTeam !== form.ownerTeam) update('ownerTeam', teams.ownerTeam);
									update('otherTeams', teams.otherTeams);
								}}
								teams={teams}
								me={me}
							/>
						) : (
							<p className="text-sm leading-normal text-med-blue">Add a team on the Organisers page first.</p>
						)}
					</FormCard>
					<FormCard
						title="Walk-ins"
						description={`Walk-ins get the next ticket number: ${WALK_IN_PREFIX}0001, ${WALK_IN_PREFIX}0002, and so on. Staff can always add them.`}
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
