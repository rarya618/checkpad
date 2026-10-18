import { buttonClass } from '@checkpad/shared/button';
import { formatDate } from '@checkpad/shared/format';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import copyLink from '../assets/copy-link.svg';
import mail from '../assets/mail.svg';
import more from '../assets/more.svg';
import shield from '../assets/shield.svg';
import trash from '../assets/trash.svg';
import ManageTeamDialog from '../components/ManageTeamDialog';
import Menu from '../components/Menu';
import { AddOrganiserDialog, EditOrganiserDialog, RemoveOrganiserDialog } from '../components/OrganiserDialogs';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { WEB_URL } from '../lib/config';
import { useEvents, useTeams, type DashboardEvent, type Team } from '../lib/events';
import { useSession } from '../lib/auth';
import { initialsOf, roleLabel, roles, useOrganisers, type Organiser } from '../lib/organisers';
import { showToast } from '../lib/toast';

// Figma "Organisers" (People) and "Organisers – teams", at 75% scale. The tab lives in
// the URL (?tab=teams) so it survives a reload.
export default function OrganisersPage() {
	const [params, setParams] = useSearchParams();
	const tab = params.get('tab') === 'teams' ? 'teams' : 'people';
	const [dialog, setDialog] = useState<
		| { kind: 'add' }
		| { kind: 'edit' | 'remove'; organiser: Organiser }
		| { kind: 'team'; team: Team | null }
		| null
	>(null);
	const close = () => setDialog(null);

	return (
		<>
			<PageHeader
				title="Organisers"
				actions={
					tab === 'people' ? (
						<button type="button" onClick={() => setDialog({ kind: 'add' })} className={buttonClass('primary')}>
							Add organiser
						</button>
					) : (
						<button type="button" onClick={() => setDialog({ kind: 'team', team: null })} className={buttonClass('primary')}>
							New team
						</button>
					)
				}
			/>
			<div className="flex flex-col gap-[21px] px-6 pb-[27px]">
				<div role="tablist" aria-label="Organisers" className="flex gap-[3px] self-start rounded-[9px] bg-light-blue p-[3px]">
					{(['people', 'teams'] as const).map((t) => (
						<button
							key={t}
							type="button"
							role="tab"
							aria-selected={tab === t}
							onClick={() => setParams(t === 'teams' ? { tab: 'teams' } : {}, { replace: true })}
							className={`rounded-[6.75px] px-[18px] py-[7.5px] font-display text-[15px] leading-[1.5] transition-colors ${
								tab === t ? 'bg-dark-blue text-white' : 'hover:bg-white/50'
							}`}
						>
							{t === 'people' ? 'People' : 'Teams'}
						</button>
					))}
				</div>
				{tab === 'people' ? <People onEdit={(o) => setDialog({ kind: 'edit', organiser: o })} onRemove={(o) => setDialog({ kind: 'remove', organiser: o })} /> : <Teams onManage={(team) => setDialog({ kind: 'team', team })} />}
			</div>

			{dialog?.kind === 'add' && <AddOrganiserDialog onClose={close} />}
			{dialog?.kind === 'edit' && <EditOrganiserDialog organiser={dialog.organiser} onClose={close} />}
			{dialog?.kind === 'remove' && <RemoveOrganiserDialog organiser={dialog.organiser} onClose={close} />}
			{dialog?.kind === 'team' && <ManageTeamDialog team={dialog.team} onClose={close} />}
		</>
	);
}

function People({ onEdit, onRemove }: { onEdit: (o: Organiser) => void; onRemove: (o: Organiser) => void }) {
	const organisers = useOrganisers();
	return (
		<>
			<div className="rounded-[15px] bg-white px-[22.5px] py-[18px]">
				<table className="w-full table-fixed">
					<colgroup>
						<col />
						<col className="w-[168px]" />
						<col className="w-[183px]" />
						<col className="w-[30px]" />
					</colgroup>
					<thead>
						<tr className="text-left font-display text-[15px] leading-[1.5] text-black">
							<th className="pr-[18px] pb-1.5">Person</th>
							<th className="pr-[18px] pb-1.5">Role</th>
							<th className="pr-[18px] pb-1.5">Team</th>
							<th className="pb-1.5">
								<span className="sr-only">Options</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{organisers.map((o) => (
							<tr key={o.id}>
								<td className="py-[7.5px] pr-[18px]">
									<div className="flex items-center gap-3">
										<span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-[15px]">
											{initialsOf(o)}
										</span>
										<div className="flex min-w-0 flex-col gap-[3px] leading-[1.5]">
											<p className="truncate font-display text-lg text-black">{o.name ?? o.email}</p>
											<p className={`truncate text-[15px] ${o.invited ? 'text-med-blue' : 'text-black'}`}>{o.invited ? 'Invited · hasn’t signed in yet' : o.email}</p>
										</div>
									</div>
								</td>
								<td className="py-[7.5px] pr-[18px]">
									<span
										className={`inline-block rounded-full px-[10.5px] py-[4.5px] text-xs leading-[1.5] font-bold whitespace-nowrap ${
											o.role === 'super-admin' ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'
										}`}
									>
										{roleLabel(o.role)}
									</span>
								</td>
								<td className="truncate py-[7.5px] pr-[18px] text-[15px] leading-[1.5] text-black">{o.team ?? 'All teams'}</td>
								<td className="py-[7.5px]">
									<OrganiserMenu organiser={o} onEdit={onEdit} onRemove={onRemove} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<dl className="flex gap-6 pl-[3px] leading-[1.5]">
				{roles.map((r) => (
					<div key={r.id} className="flex min-w-0 flex-1 flex-col gap-[3px]">
						<dt className="text-[13.5px] font-bold">{r.label}</dt>
						<dd className="text-xs text-med-blue">{r.description}</dd>
					</div>
				))}
			</dl>
		</>
	);
}

// Figma "Organisers – row menu". You can't change or remove your own access.
function OrganiserMenu({ organiser, onEdit, onRemove }: { organiser: Organiser; onEdit: (o: Organiser) => void; onRemove: (o: Organiser) => void }) {
	const session = useSession();
	const self = session?.email === organiser.email.toLowerCase();
	return (
		<Menu
			label={`Options for ${organiser.name ?? organiser.email}`}
			buttonClassName="rounded-md p-1 hover:bg-light-blue/60"
			items={[
				...(organiser.invited ? [{ label: 'Resend invite', icon: mail, onSelect: () => showToast(`Invite sent to ${organiser.email}`) }] : []),
				{ label: 'Edit role and team', icon: shield, disabled: self, onSelect: () => onEdit(organiser) },
				{ label: 'Remove organiser', icon: trash, separated: true, disabled: self, onSelect: () => onRemove(organiser) },
			]}
		>
			<img src={more} alt="" width={18} height={18} />
		</Menu>
	);
}

/** The event a team link opens: the one open for check-in, else the next upcoming one. */
function teamLinkTarget(team: Team, events: DashboardEvent[]) {
	const own = events.filter((e) => e.team === team.name);
	const now = Date.now();
	return (
		own.find((e) => e.selfCheckInOpen) ??
		own.filter((e) => new Date(e.endsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
	);
}

function Teams({ onManage }: { onManage: (team: Team) => void }) {
	const teams = useTeams();
	const events = useEvents();
	const organisers = useOrganisers();
	return (
		<>
			{teams.map((team) => {
				const members = organisers.filter((o) => o.team === team.name).length;
				const target = teamLinkTarget(team, events);
				const url = `${WEB_URL.replace(/\/$/, '')}/team/${team.slug}`;
				return (
					<section key={team.slug} className="flex flex-col gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px]">
						<div className="flex items-center gap-3">
							<div className="flex min-w-0 flex-1 flex-col gap-[4.5px]">
								<h2 className="truncate font-display text-2xl leading-[1.2]">{team.name}</h2>
								<p className="text-[13.5px] leading-[1.5] text-med-blue">
									{members} member{members === 1 ? '' : 's'}
								</p>
							</div>
							<button type="button" onClick={() => onManage(team)} className={buttonClass('secondary')}>
								Manage
							</button>
						</div>
						<div className="flex items-center gap-3 rounded-[7.5px] bg-off-white px-[15px] py-3">
							<div className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[1.5] text-med-blue">
								<p className="text-xs">Permanent link for printed signs</p>
								<a href={url} target="_blank" rel="noreferrer" className="truncate text-[15px] font-semibold underline">
									{url.replace(/^https?:\/\//, '')}
								</a>
							</div>
							<button
								type="button"
								aria-label={`Copy ${team.name}’s team link`}
								onClick={() => navigator.clipboard.writeText(url).then(() => showToast('Team link copied'))}
								className="shrink-0 rounded p-0.5 hover:bg-light-blue/60"
							>
								<img src={copyLink} alt="" width={16.5} height={16.5} />
							</button>
						</div>
						<div className="flex flex-wrap items-center gap-[9px] leading-[1.5]">
							<p className="text-[13.5px] text-black">Points to</p>
							{target ? (
								<>
									<p className="font-display text-[15px]">{target.name}</p>
									<p className="text-[13.5px] text-black">· {formatDate(new Date(target.startsAt), target.timeZone)}</p>
									<StatusBadge open={target.selfCheckInOpen} />
								</>
							) : (
								<p className="text-[13.5px] text-med-blue">No upcoming event</p>
							)}
						</div>
					</section>
				);
			})}
			<p className="text-[13.5px] leading-[1.5] text-med-blue">A team link opens the team’s event that is open for check-in, or else its next upcoming event.</p>
		</>
	);
}
