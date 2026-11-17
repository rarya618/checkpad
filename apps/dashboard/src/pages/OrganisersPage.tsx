import { buttonClass } from '@checkpad/shared/button';
import { findCountry } from '@checkpad/shared/countries';
import { formatDate } from '@checkpad/shared/format';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import more from '../assets/more.svg';
import shield from '../assets/shield.svg';
import trash from '../assets/trash.svg';
import DeleteTeamDialog from '../components/DeleteTeamDialog';
import ManageTeamDialog from '../components/ManageTeamDialog';
import Menu from '../components/Menu';
import { AddOrganiserDialog, EditOrganiserDialog, RemoveOrganiserDialog } from '../components/OrganiserDialogs';
import PageHeader from '../components/PageHeader';
import CopyLink from '../components/CopyLink';
import StatusBadge from '../components/StatusBadge';
import { WEB_URL } from '../lib/config';
import { useSession } from '../lib/auth';
import { useEvents, type DashboardEvent } from '../lib/events';
import { initialsOf, needsTeam, organiserTeam, roleLabel, roles, useMe, useOrganisers, type Organiser } from '../lib/organisers';
import { useTeams, type Team } from '../lib/teams';
import { useMediaQuery } from '../lib/useMediaQuery';
import { usePageArrival } from '../lib/pageTransition';

// The Organisers page: a rail of views (everyone, people still to sign in, each team, super
// admins, organisers still to set up their team) beside a panel for the chosen one. A team's
// panel holds its sign link, the event that link opens and its people, so who runs a team and
// where its printed signs point are read together. The view lives in the URL (?team=<slug> or
// ?show=invited) so it survives a reload. Only super admins see every team: everyone else sees
// their own team's panel and no rail (firestore.rules lets them read only their team).

type View =
	| { kind: 'everyone' }
	| { kind: 'invited' }
	| { kind: 'super-admins' }
	| { kind: 'no-team' }
	| { kind: 'team'; team: Team };

type Dialog =
	| { kind: 'add'; teamId?: string }
	| { kind: 'edit' | 'remove'; organiser: Organiser }
	| { kind: 'team'; team: Team | null }
	| { kind: 'delete-team'; team: Team };

const SHOW = { invited: 'invited', 'super-admins': 'super-admins', 'no-team': 'no-team' } as const;

export default function OrganisersPage() {
	usePageArrival();
	const me = useMe();
	const admin = me.role === 'super-admin';
	const organisers = useOrganisers(me) ?? [];
	const teams = useTeams() ?? [];
	const [params] = useSearchParams();
	const [dialog, setDialog] = useState<Dialog | null>(null);
	const close = () => setDialog(null);

	// Super admins choose a view in the rail; anyone else has only their own team
	const ownTeam = teams.find((t) => t.id === me.teamId);
	const chosenTeam = teams.find((t) => t.slug === params.get('team'));
	const show = params.get('show');
	const view: View | null = !admin
		? ownTeam
			? { kind: 'team', team: ownTeam }
			: null
		: chosenTeam
			? { kind: 'team', team: chosenTeam }
			: show === SHOW.invited || show === SHOW['super-admins'] || show === SHOW['no-team']
				? { kind: show }
				: { kind: 'everyone' };

	const actions = {
		admin,
		onAdd: (teamId?: string) => setDialog({ kind: 'add', teamId }),
		onEdit: (organiser: Organiser) => setDialog({ kind: 'edit', organiser }),
		onRemove: (organiser: Organiser) => setDialog({ kind: 'remove', organiser }),
		onManage: (team: Team) => setDialog({ kind: 'team', team }),
	};

	return (
		<>
			<PageHeader
				title="Organisers"
				actions={
					admin && (
						<button type="button" onClick={() => setDialog({ kind: 'add' })} className={buttonClass('primary')}>
							Add organiser
						</button>
					)
				}
			/>
			<div className="flex flex-col gap-4 px-6 pt-3.5 pb-7 xl:flex-row xl:items-start xl:gap-6">
				{admin && view && <Rail view={view} organisers={organisers} teams={teams} onNewTeam={() => setDialog({ kind: 'team', team: null })} />}
				{view && (
					// Keyed by the view, so the panel fades in afresh when another is chosen
					<section key={viewKey(view)} aria-labelledby="organisers-view" className="@container min-w-0 flex-1 animate-panel-in rounded-xl border border-line bg-white px-4 py-5 md:px-6">
						{view.kind === 'team' ? (
							<TeamPanel team={view.team} organisers={organisers} {...actions} />
						) : (
							<ListPanel view={view} organisers={organisers} teams={teams} {...actions} />
						)}
					</section>
				)}
			</div>

			{dialog?.kind === 'add' && <AddOrganiserDialog teamId={dialog.teamId} onClose={close} />}
			{dialog?.kind === 'edit' && <EditOrganiserDialog organiser={dialog.organiser} onClose={close} />}
			{dialog?.kind === 'remove' && <RemoveOrganiserDialog organiser={dialog.organiser} onClose={close} />}
			{dialog?.kind === 'team' && (
				<ManageTeamDialog team={dialog.team} onClose={close} onDelete={() => dialog.team && setDialog({ kind: 'delete-team', team: dialog.team })} />
			)}
			{dialog?.kind === 'delete-team' && <DeleteTeamDialog team={dialog.team} onClose={close} />}
		</>
	);
}

const viewKey = (view: View) => (view.kind === 'team' ? `team:${view.team.id}` : view.kind);

const viewSearch = (view: View) => (view.kind === 'team' ? `?team=${view.team.slug}` : view.kind === 'everyone' ? '' : `?show=${view.kind}`);

interface Actions {
	admin: boolean;
	onAdd: (teamId?: string) => void;
	onEdit: (o: Organiser) => void;
	onRemove: (o: Organiser) => void;
	onManage: (team: Team) => void;
}

// The rail: a column beside the panel from 1280px (narrower, beside the app's sidebar, the panel needs the room), a row of entries that scrolls sideways above
// it below that. The chosen entry's light-blue fill slides to the next one chosen.
function Rail({ view, organisers, teams, onNewTeam }: { view: View; organisers: Organiser[]; teams: Team[]; onNewTeam: () => void }) {
	const column = useMediaQuery('(min-width: 1280px)');
	const invited = organisers.filter((o) => o.invited).length;
	const noTeam = organisers.filter(needsTeam).length;
	const entries: ({ view: View; label: string; count: number } | 'divider')[] = [
		{ view: { kind: 'everyone' }, label: 'Everyone', count: organisers.length },
		{ view: { kind: 'invited' }, label: 'Invited', count: invited },
		'divider',
		...teams.map((team) => ({ view: { kind: 'team', team } as View, label: team.name, count: organisers.filter((o) => o.teamId === team.id).length })),
		{ view: { kind: 'super-admins' }, label: 'Super admins', count: organisers.filter((o) => o.role === 'super-admin').length },
		// Only while someone is still to set up their team
		...(noTeam || view.kind === 'no-team' ? [{ view: { kind: 'no-team' } as View, label: 'No team yet', count: noTeam }] : []),
	];
	const current = viewKey(view);

	const list = useRef<HTMLUListElement>(null);
	const [fill, setFill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
	// The fill appears where it is at first and only slides once it's been drawn
	const [drawn, setDrawn] = useState(false);
	useLayoutEffect(() => {
		// The entry's list item: the link's own offsets are measured from it
		const active = list.current?.querySelector<HTMLElement>('[aria-current="page"]')?.parentElement;
		if (!list.current || !active) return setFill(null);
		const measure = () => setFill({ x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight });
		measure();
		if (!column) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		const resized = new ResizeObserver(measure);
		resized.observe(list.current);
		return () => resized.disconnect();
	}, [current, column, entries.length]);
	useLayoutEffect(() => {
		if (fill && !drawn) requestAnimationFrame(() => setDrawn(true));
	}, [fill, drawn]);

	return (
		<nav aria-label="Organisers by team" className="-mx-6 shrink-0 xl:mx-0 xl:w-60 xl:rounded-xl xl:border xl:border-line xl:bg-white xl:p-2">
			<ul ref={list} className="relative flex scroll-px-6 gap-1 overflow-x-auto px-6 py-1 [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] [scrollbar-width:none] xl:flex-col xl:gap-0.5 xl:overflow-visible xl:p-0 xl:[mask-image:none]">
				{fill && (
					<li
						aria-hidden="true"
						className={`pointer-events-none absolute top-0 left-0 rounded-lg bg-light-blue ${drawn ? 'motion-safe:transition-[translate,width,height] motion-safe:duration-220 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]' : ''}`}
						style={{ translate: `${fill.x}px ${fill.y}px`, width: fill.w, height: fill.h }}
					/>
				)}
				{entries.map((entry, i) =>
					entry === 'divider' ? (
						<li key={`divider-${i}`} aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-light-blue xl:mx-3 xl:my-1.5 xl:h-px xl:w-auto" />
					) : (
						<li key={viewKey(entry.view)} className="relative shrink-0">
							<Link
								to={{ search: viewSearch(entry.view) }}
								replace
								aria-current={viewKey(entry.view) === current ? 'page' : undefined}
								className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm leading-normal whitespace-nowrap text-dark-blue transition-colors hover:bg-light-blue/50 aria-[current=page]:font-bold aria-[current=page]:hover:bg-transparent xl:whitespace-normal"
							>
								<span className="min-w-0 xl:truncate">{entry.label}</span>
								{/* A team nobody is in stands out: nobody can run its events */}
								<span
									className={`text-xs tabular-nums group-aria-[current=page]:text-dark-blue ${
										entry.view.kind === 'team' && entry.count === 0 ? 'font-bold text-dark-blue' : 'text-med-blue'
									}`}
								>
									{entry.count}
								</span>
							</Link>
						</li>
					),
				)}
				<li className="shrink-0 xl:mt-1.5 xl:border-t xl:border-light-blue xl:pt-1.5">
					<button type="button" onClick={onNewTeam} className="w-full rounded-lg px-3 py-2 text-left text-sm leading-normal font-bold whitespace-nowrap text-med-blue transition-colors hover:bg-light-blue/50">
						New team
					</button>
				</li>
			</ul>
		</nav>
	);
}

// Everyone, Invited, Super admins and No team yet: one list each, with a line on what it holds
function ListPanel({ view, organisers, teams, ...actions }: { view: Exclude<View, { kind: 'team' }>; organisers: Organiser[]; teams: Team[] } & Actions) {
	const panels = {
		everyone: { title: 'Everyone', about: 'Everyone who can sign in to the dashboard.', people: organisers, empty: 'No one has been added yet.' },
		invited: { title: 'Invited', about: 'Added, and hasn’t signed in yet.', people: organisers.filter((o) => o.invited), empty: 'Everyone you’ve added has signed in.' },
		'super-admins': { title: 'Super admins', about: `${roles[0].description}.`, people: organisers.filter((o) => o.role === 'super-admin'), empty: 'No super admins.' },
		'no-team': {
			title: 'No team yet',
			about: 'Organisers invited to start a new team. They name it and say where it meets when they first sign in.',
			people: organisers.filter(needsTeam),
			empty: 'Everyone invited to start a team has set it up.',
		},
	};
	const panel = panels[view.kind];
	// A team column only where people from different teams share the list
	const showTeam = view.kind === 'everyone' || view.kind === 'invited';
	return (
		<div className="flex flex-col gap-4">
			<PanelHeading title={panel.title} about={panel.about} />
			{panel.people.length ? <People people={panel.people} teams={teams} showTeam={showTeam} {...actions} /> : <p className="border-t border-light-blue pt-4 text-sm leading-normal text-med-blue">{panel.empty}</p>}
			{view.kind === 'everyone' && <RoleGuide />}
		</div>
	);
}

function TeamPanel({ team, organisers, ...actions }: { team: Team; organisers: Organiser[] } & Actions) {
	const members = organisers.filter((o) => o.teamId === team.id);
	const place = [team.city, findCountry(team.country)?.name].filter(Boolean).join(', ');
	const count = `${members.length} member${members.length === 1 ? '' : 's'}`;
	return (
		<div className="flex flex-col gap-5">
			{/* Like an event's header: the name with Manage, then quiet lines of facts, closed off by a
			    hairline from the members below */}
			<div className="flex flex-col gap-1.5 border-b border-line pb-5">
				<PanelHeading
					title={team.name}
					about={
						place ? (
							// A narrow panel puts the count on a line of its own, without the separator
							<>
								{place}
								<span aria-hidden="true" className="hidden @sm:inline">
									{' '}·{' '}
								</span>
								<span className="block whitespace-nowrap @sm:inline">{count}</span>
							</>
						) : (
							<span className="whitespace-nowrap">{count}</span>
						)
					}
					action={
						actions.admin && (
							<button type="button" onClick={() => actions.onManage(team)} className={buttonClass('secondary')}>
								Manage
							</button>
						)
					}
				/>
				<TeamLink team={team} />
			</div>
			<div className="flex flex-col gap-1">
				<div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
					<h3 className="font-display text-lg">Members</h3>
					{actions.admin && (
						// Short, under its Members heading; the team rides in its accessible name
						<button type="button" onClick={() => actions.onAdd(team.id)} aria-label={`Add a member to ${team.name}`} className={buttonClass('secondary')}>
							Add member
						</button>
					)}
				</div>
				{members.length ? (
					<People people={members} showTeam={false} {...actions} />
				) : (
					<div className="flex flex-col gap-1 border-t border-light-blue pt-4 leading-normal">
						<p className="text-sm text-dark-blue">No one is in {team.name} yet.</p>
						<p className="text-sm text-med-blue">Add an organiser to create its events, or a team member to check people in at them.</p>
					</div>
				)}
			</div>
			{members.length > 0 && (
				<p className="max-w-lg text-sm leading-normal text-med-blue">
					Organisers create and edit {team.name}’s events. Team members check people in at them.
				</p>
			)}
		</div>
	);
}

function PanelHeading({ title, about, action }: { title: string; about: ReactNode; action?: ReactNode }) {
	return (
		<div className="flex items-start gap-4">
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<h2 id="organisers-view" className="font-display text-2xl leading-tight break-words">
					{title}
				</h2>
				<p className="text-sm leading-normal text-med-blue">{about}</p>
			</div>
			{action}
		</div>
	);
}

/** The event a team link opens: the one open for check-in, else the next upcoming one. */
function teamLinkTarget(team: Team, events: DashboardEvent[]) {
	const own = events.filter((e) => e.teamIds.includes(team.id));
	const now = Date.now();
	return (
		own.find((e) => e.selfCheckInOpen) ??
		own.filter((e) => new Date(e.endsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
	);
}

// The team's permanent link with a copy icon, and the event it opens today, in one quiet line
// (two when the panel is narrow). What the link is for rides in its tooltip and description.
function TeamLink({ team }: { team: Team }) {
	const target = teamLinkTarget(team, useEvents());
	const url = `${WEB_URL.replace(/\/$/, '')}/team/${team.slug}`;
	const about = 'For printed signs: it opens whichever event is open for check-in, or else the next one, so a sign printed once keeps working.';
	return (
		<div className="flex min-w-0 flex-col items-start gap-1 text-sm leading-normal text-med-blue @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-2">
			<span className="flex min-w-0 max-w-full items-center gap-2">
				<span className="shrink-0">Team link</span>
				<a href={url} target="_blank" rel="noreferrer" title={about} aria-describedby={`team-link-about-${team.id}`} className="truncate underline underline-offset-2 hover:text-dark-blue">
					{url.replace(/^https?:\/\//, '')}
				</a>
				<span id={`team-link-about-${team.id}`} className="sr-only">
					{about}
				</span>
				<CopyLink url={url} label="Copy team link" />
			</span>
			{target ? (
				<span className="flex min-w-0 flex-wrap items-center gap-x-2">
					<span>opens</span>
					<span className="font-semibold text-dark-blue">{target.name}</span>
					<span aria-hidden="true">·</span>
					<span className="whitespace-nowrap">{formatDate(new Date(target.startsAt), target.timeZone)}</span>
					{/* The separator stays with the status, and a narrow panel, where the status wraps
					    to a line of its own, drops it */}
					<span className="flex items-center gap-2 whitespace-nowrap">
						<span aria-hidden="true" className="hidden @sm:inline">
							·
						</span>
						<StatusBadge open={target.selfCheckInOpen} />
					</span>
				</span>
			) : (
				<span>No upcoming event to open</span>
			)}
		</div>
	);
}

// People in a list. Role and Team get columns of their own once the panel is wide enough; below
// that they sit under the email, so names keep their room.
function People({ people, teams, showTeam, admin, onEdit, onRemove }: { people: Organiser[]; teams?: Team[]; showTeam: boolean } & Actions) {
	return (
		<table className="w-full table-fixed leading-normal">
			<colgroup>
				<col />
				<col className="hidden w-36 @2xl:table-column" />
				{showTeam && <col className="hidden w-44 @2xl:table-column" />}
				<col className="w-8" />
			</colgroup>
			<thead className="sr-only @2xl:not-sr-only @2xl:table-header-group">
				<tr className="text-left font-display text-sm text-dark-blue">
					<th className="pt-1 pr-4 pb-2">Person</th>
					<th className="hidden pt-1 pr-4 pb-2 @2xl:table-cell">Role</th>
					{showTeam && <th className="hidden pt-1 pr-4 pb-2 @2xl:table-cell">Team</th>}
					<th className="pt-1 pb-2">
						<span className="sr-only">Options</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{people.map((o) => (
					<tr key={o.id} className="border-t border-light-blue">
						<td className="py-5 pr-4">
							<div className="flex items-start gap-4 @2xl:items-center">
								<span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-base md:size-9 md:text-sm">
									{initialsOf(o)}
								</span>
								<div className="flex min-w-0 flex-col gap-0.5">
									<p className="truncate font-display text-base leading-tight text-dark-blue" title={o.name ?? o.email}>
										{o.name ?? o.email}
									</p>
									{o.invited ? (
										<p className="flex min-w-0 items-center gap-1.5 text-xs text-med-blue">
											<span className="shrink-0 rounded-full border border-med-blue px-2 py-px font-bold">Invited</span>
											<span className="truncate">hasn’t signed in yet</span>
										</p>
									) : (
										<p className="truncate text-sm leading-snug text-med-blue" title={o.email}>
											{o.email}
										</p>
									)}
									<p className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 pt-3 text-sm text-dark-blue @2xl:hidden">
										<RoleBadge organiser={o} />
										{showTeam && <span>{organiserTeam(teams, o)}</span>}
									</p>
								</div>
							</div>
						</td>
						<td className="hidden py-5 pr-4 @2xl:table-cell">
							<RoleBadge organiser={o} />
						</td>
						{showTeam && <td className="hidden truncate py-5 pr-4 text-sm text-dark-blue @2xl:table-cell">{organiserTeam(teams, o)}</td>}
						<td className="py-5 align-top @2xl:align-middle">{admin && <OrganiserMenu organiser={o} onEdit={onEdit} onRemove={onRemove} />}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

// What each role can do, under Everyone: the one list where all three roles sit together
function RoleGuide() {
	return (
		<dl className="flex flex-col gap-3 border-t border-light-blue pt-4 leading-normal @2xl:flex-row @2xl:gap-6">
			{roles.map((r) => (
				<div key={r.id} className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
					<dt>
						<RoleBadge organiser={{ role: r.id }} />
					</dt>
					<dd className="text-sm text-med-blue">{r.description}</dd>
				</div>
			))}
		</dl>
	);
}

// Figma "Organisers" role pill
function RoleBadge({ organiser }: { organiser: Pick<Organiser, 'role'> }) {
	return (
		<span
			className={`inline-block shrink-0 rounded-full px-3 py-1 text-sm leading-normal font-bold tracking-normal whitespace-nowrap md:px-2.5 md:text-xs ${
				organiser.role === 'super-admin' ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'
			}`}
		>
			{roleLabel(organiser.role)}
		</span>
	);
}

// Figma "Organisers – row menu". Your own row too: the API refuses a change that would leave
// nobody able to manage organisers.
function OrganiserMenu({ organiser, onEdit, onRemove }: { organiser: Organiser; onEdit: (o: Organiser) => void; onRemove: (o: Organiser) => void }) {
	const session = useSession();
	const self = session?.email === organiser.email.toLowerCase();
	return (
		<Menu
			label={`Options for ${organiser.name ?? organiser.email}`}
			buttonClassName="rounded-md p-1 hover:bg-light-blue/60"
			items={[
				{ label: self ? 'Edit your details' : 'Edit details', icon: shield, onSelect: () => onEdit(organiser) },
				{ label: self ? 'Remove yourself' : 'Remove organiser', icon: trash, separated: true, onSelect: () => onRemove(organiser) },
			]}
		>
			<img src={more} alt="" width={18} height={18} />
		</Menu>
	);
}
