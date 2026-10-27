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
	formToInput,
	selfWalkInsNote,
	unsavedMessage,
	type EventForm,
} from '../lib/eventForm';
import { isSlugTaken, updateEvent, useEvent, type DashboardEvent } from '../lib/events';
import { useSession } from '../lib/auth';
import { useCurrentOrganiser } from '../lib/organisers';
import { nextWalkInTicket } from '../lib/roster';
import { useTeams } from '../lib/teams';
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
	const navigate = useNavigate();
	const session = useSession();
	const me = useCurrentOrganiser();
	const teams = useTeams() ?? [];
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
		const input = formToInput(form, newSlug);
		dirtyRef.current = false;
		// Shows at once; the rules refuse a link another team's event has, which we can't see
		updateEvent(event, input, me?.name ?? session?.email ?? 'An organiser').catch(() =>
			showToast(`Couldn’t save the settings.${input.slug !== slug ? ' The new link may be taken: try another.' : ' Try again.'}`),
		);
		// Saving trims text, so take the saved values back or the form would still look changed
		setForm(eventToForm({ ...event, ...input }));
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
					actionsRowOnPhones
					level={2}
					title="Settings"
					// 24px above (the gap below the event details); sticks with 24px left, like the page headers
					className="top-0 pt-6 pb-[15px]"
					titleAddon={
						dirty && (
							// Figma "Event settings – unsaved changes": full size on phones, 75% from md up
							<span className="flex shrink-0 items-center gap-2 rounded-full bg-light-blue py-1.5 pr-3.5 pl-3 text-base leading-[1.5] font-bold tracking-normal md:gap-1.5 md:py-[4.5px] md:pr-[10.5px] md:pl-[9px] md:text-xs">
								<span aria-hidden="true" className="size-2 rounded-full bg-med-blue md:size-1.5" />
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
				<div className="grid grid-cols-1 gap-[18px] px-6 pb-[27px] lg:grid-cols-2">
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
						<FormCard level={3} title="Team and walk-ins" description="Staff can always add walk-ins from the dashboard.">
							<SelectField label="Team" value={form.team} onChange={(e) => update('team', e.target.value)}>
								{teams.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</SelectField>
							<TextField
								label="Walk-in ticket title"
								value={form.walkInTicketTitle}
								onChange={(e) => update('walkInTicketTitle', e.target.value)}
								hint={`Next walk-in ticket: ${nextWalkInTicket(event)}`}
							/>
							<TextField label="Walk-in venue" value={form.walkInVenue} onChange={(e) => update('walkInVenue', e.target.value)} />
							<SwitchRow
								label="Attendees can add themselves"
								note={selfWalkInsNote(form.selfWalkIns)}
								checked={form.selfWalkIns}
								onChange={(on) => update('selfWalkIns', on)}
							/>
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
					{/* Stacked on phones, with Save and leave on top */}
					<div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
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
