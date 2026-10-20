import { buttonClass } from '@checkpad/shared/button';
import { formatClockTime } from '@checkpad/shared/format';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useBlocker, useNavigate, useParams } from 'react-router';
import Dialog from '../components/Dialog';
import { DateTimeFields } from '../components/EventFields';
import EventOverview from '../components/EventOverview';
import { LinkField, SelectField, TextField } from '../components/Field';
import FormCard from '../components/FormCard';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { SwitchRow } from '../components/Switch';
import { WEB_HOST } from '../lib/config';
import {
	changedSettings,
	cleanSlug,
	eventToForm,
	formIsComplete,
	formTimes,
	unsavedMessage,
	type EventForm,
} from '../lib/eventForm';
import { isSlugTaken, teams, updateEvent, useEvent, type DashboardEvent } from '../lib/events';
import { useCurrentOrganiser, useSession } from '../lib/auth';
import { nextWalkInTicket, useRoster } from '../lib/roster';
import { showToast } from '../lib/toast';

// Keyed by slug so moving between events (or saving a new link) starts a fresh form.
export default function EventSettingsRoute() {
	const { slug = '' } = useParams();
	return <EventSettingsPage key={slug} slug={slug} />;
}

// Figma "Event settings", with its "unsaved changes", "leave without saving?" and
// "settings saved" states.
function EventSettingsPage({ slug }: { slug: string }) {
	// EventLayout has already redirected unknown slugs.
	const event = useEvent(slug)!;
	const roster = useRoster(slug);
	const navigate = useNavigate();
	const session = useSession();
	const me = useCurrentOrganiser();
	const saved = useMemo(() => eventToForm(event), [event]);
	const [form, setForm] = useState(saved);

	const changed = changedSettings(saved, form);
	const dirty = changed.length > 0;
	const newSlug = form.slug.replace(/-+$/, '');
	const slugTaken = newSlug !== '' && isSlugTaken(newSlug, slug);
	const valid = formIsComplete(form) && !slugTaken;

	// Ask before leaving with unsaved changes: in-app links via the router, closing the tab via the browser.
	const dirtyRef = useRef(dirty);
	dirtyRef.current = dirty;
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
	);
	useEffect(() => {
		if (!dirty) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		addEventListener('beforeunload', warn);
		return () => removeEventListener('beforeunload', warn);
	}, [dirty]);

	function update<K extends keyof EventForm>(key: K, value: EventForm[K]) {
		setForm((f) => ({ ...f, [key]: value }));
	}

	// Saving under a new link moves this page too: EventLayout follows the rename.
	function save() {
		const switched = form.selfCheckInOpen !== event.selfCheckInOpen;
		const next: DashboardEvent = {
			...event,
			slug: newSlug,
			name: form.name.trim(),
			description: form.description.trim(),
			...formTimes(form),
			timeZone: form.timeZone,
			team: form.team,
			walkInTicketTitle: form.walkInTicketTitle.trim(),
			walkInVenue: form.walkInVenue.trim(),
			selfWalkIns: form.selfWalkIns,
			selfCheckInOpen: form.selfCheckInOpen,
			selfCheckInChangedBy: switched ? (me?.name ?? session?.email ?? null) : event.selfCheckInChangedBy,
			selfCheckInChangedAt: switched ? new Date().toISOString() : event.selfCheckInChangedAt,
		};
		dirtyRef.current = false;
		updateEvent(slug, next);
		// Saving trims text, so take the saved values back or the form would still look changed
		setForm(eventToForm(next));
		showToast('Settings saved');
	}

	function saveAndLeave() {
		if (blocker.state !== 'blocked') return;
		const { pathname, search, hash } = blocker.location;
		if (newSlug === slug) {
			save();
			blocker.proceed();
			return;
		}
		// Saving a new link makes EventLayout redirect this page to it; let that finish
		// (flushSync), then go where the person was heading, under the new link if it was inside this event.
		blocker.reset();
		flushSync(save);
		const inEvent = pathname === `/events/${slug}` || pathname.startsWith(`/events/${slug}/`);
		navigate((inEvent ? pathname.replace(`/events/${slug}`, `/events/${newSlug}`) : pathname) + search + hash);
	}

	const team = teams.find((t) => t.name === form.team) ?? teams[0];
	const linkLocked = event.selfCheckInOpen;

	return (
		<>
			<EventOverview event={event} />
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (dirty && valid) save();
				}}
			>
				<PageHeader
					level={2}
					title="Settings"
					// 24px above (the gap below the event details); sticks with 24px left, like the page headers
					className="top-0 pt-6 pb-[15px]"
					titleAddon={
						dirty && (
							<span className="flex shrink-0 items-center gap-1.5 rounded-full bg-light-blue py-[4.5px] pr-[10.5px] pl-[9px] text-xs leading-[1.5] font-bold">
								<span aria-hidden="true" className="size-1.5 rounded-full bg-med-blue" />
								Unsaved changes
							</span>
						)
					}
					actions={
						<div className="flex shrink-0 items-center gap-[15px]">
							<button type="button" disabled={!dirty} onClick={() => setForm(saved)} className={`${buttonClass('secondary')} disabled:opacity-50`}>
								Discard
							</button>
							<button type="submit" disabled={!dirty || !valid} className={`${buttonClass('primary')} disabled:opacity-50`}>
								Save changes
							</button>
						</div>
					}
				/>
				<div className="grid gap-[18px] px-6 pb-[27px] lg:grid-cols-2">
					<div className="flex flex-col gap-[15px]">
						<FormCard
							level={3}
							title="Check-in"
							badge={<StatusBadge open={event.selfCheckInOpen} />}
							description="Staff can always check people in from the dashboard."
						>
							<SwitchRow
								label="Self check-in open"
								note={selfCheckInNote(event, form.selfCheckInOpen)}
								checked={form.selfCheckInOpen}
								onChange={(on) => update('selfCheckInOpen', on)}
							/>
						</FormCard>
						<FormCard level={3} title="Team and walk-ins">
							<SelectField label="Team" value={form.team} onChange={(e) => update('team', e.target.value)}>
								{teams.map((t) => (
									<option key={t.slug}>{t.name}</option>
								))}
							</SelectField>
							<TextField
								label="Walk-in ticket title"
								value={form.walkInTicketTitle}
								onChange={(e) => update('walkInTicketTitle', e.target.value)}
								hint={`Next walk-in ticket: ${nextWalkInTicket(roster, team.walkInTicketPrefix)}`}
							/>
							<TextField label="Walk-in venue" value={form.walkInVenue} onChange={(e) => update('walkInVenue', e.target.value)} />
						</FormCard>
					</div>
					<FormCard level={3} title="Details">
						<TextField label="Name" required value={form.name} onChange={(e) => update('name', e.target.value)} />
						<LinkField
							label="Link"
							host={WEB_HOST}
							required
							readOnly={linkLocked}
							value={form.slug}
							onChange={(e) => update('slug', cleanSlug(e.target.value))}
							hint={linkLocked ? 'Locked while check-in is open.' : 'Attendees use this link to check in.'}
							error={slugTaken ? 'Another event already uses this link.' : null}
						/>
						<TextField label="Description" value={form.description} onChange={(e) => update('description', e.target.value)} />
						<DateTimeFields form={form} update={update} />
					</FormCard>
				</div>
			</form>

			{blocker.state === 'blocked' && (
				<Dialog title="Leave without saving?" description={unsavedMessage(changed)} onClose={() => blocker.reset()} className="w-[624px]">
					<div className="flex justify-end gap-3">
						<button type="button" onClick={() => blocker.reset()} className={buttonClass('secondary')}>
							Keep editing
						</button>
						<button
							type="button"
							onClick={() => {
								dirtyRef.current = false;
								blocker.proceed();
							}}
							className={buttonClass('secondary')}
						>
							Discard and leave
						</button>
						<button type="button" disabled={!valid} onClick={saveAndLeave} className={`${buttonClass('primary')} disabled:opacity-50`}>
							Save and leave
						</button>
					</div>
				</Dialog>
			)}
		</>
	);
}

/** "Opened by Russal Arya at 16:45", or what saving will do if the switch has moved. */
function selfCheckInNote(event: DashboardEvent, draftOpen: boolean) {
	if (draftOpen !== event.selfCheckInOpen) return draftOpen ? 'Opens when you save' : 'Closes when you save';
	if (!event.selfCheckInChangedBy || !event.selfCheckInChangedAt) return 'Not opened yet';
	const time = formatClockTime(new Date(event.selfCheckInChangedAt), event.timeZone);
	return `${event.selfCheckInOpen ? 'Opened' : 'Closed'} by ${event.selfCheckInChangedBy} at ${time}`;
}
