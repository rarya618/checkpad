import { buttonClass } from '@checkpad/shared/button';
import { useState, type ReactNode } from 'react';
import mail from '../assets/mail.svg';
import x from '../assets/x.svg';
import { looksLikeEmail } from '../lib/checkIn';
import { signOut, useSession } from '../lib/auth';
import { inviteOrganiser, isOrganiser, needsTeam, removeOrganiser, roles, updateOrganiser, useMe, useOrganisers, type Organiser, type OrganiserChangeError, type Role } from '../lib/organisers';
import { teamName, useTeams } from '../lib/teams';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';
import { SelectField, TextField } from './Field';

// Figma "Organisers – add organiser", "– edit organiser" and "– remove organiser", at 75% scale.

function CloseButton({ onClose }: { onClose: () => void }) {
	return (
		<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
			<img src={x} alt="" width={18} height={18} />
		</button>
	);
}

function Actions({ onCancel, submit, disabled }: { onCancel: () => void; submit: ReactNode; disabled?: boolean }) {
	return (
		<div className="flex justify-end gap-3">
			<button type="button" onClick={onCancel} className={buttonClass('secondary')}>
				Cancel
			</button>
			<button type="submit" disabled={disabled} className={`${buttonClass('primary')} disabled:opacity-50`}>
				{submit}
			</button>
		</div>
	);
}

// The Team select's "New team" option (not in Figma): an organiser invited to start their own
// team, which they name when they first sign in (OnboardingPage)
const NEW_TEAM = 'new';

/** The team ID to save for the Team select's value. */
const teamIdFor = (team: string) => (team === NEW_TEAM || team === '' ? null : team);

/**
 * Role and team selects (team IDs, or NEW_TEAM); super admins see every team, so their team is
 * fixed to "All teams". Only organisers can start a new team: team members join an existing one.
 */
function RoleAndTeam({ role, team, setRole, setTeam }: { role: Role; team: string; setRole: (r: Role) => void; setTeam: (t: string) => void }) {
	const teams = useTeams() ?? [];
	return (
		<>
			<SelectField
				label="Role"
				value={role}
				onChange={(e) => {
					const next = e.target.value as Role;
					setRole(next);
					if (next === 'team-member' && team === NEW_TEAM) setTeam(teams[0]?.id ?? '');
				}}
				hint={`${roles.find((r) => r.id === role)!.description}.`}
			>
				{roles.map((r) => (
					<option key={r.id} value={r.id}>
						{r.label}
					</option>
				))}
			</SelectField>
			<SelectField
				label="Team"
				value={role === 'super-admin' ? '' : team}
				disabled={role === 'super-admin'}
				onChange={(e) => setTeam(e.target.value)}
				hint={role === 'organiser' && team === NEW_TEAM ? 'They’ll name the team and say where it meets when they first sign in.' : undefined}
				className="has-disabled:opacity-60"
			>
				{role === 'super-admin' && <option value="">All teams</option>}
				{role === 'organiser' && <option value={NEW_TEAM}>New team</option>}
				{teams.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</SelectField>
		</>
	);
}

/**
 * `email` fills in the address, for someone invited from the waitlist, who starts a new team.
 * `teamId` picks the team, for adding someone from that team's panel on the Organisers page.
 */
export function AddOrganiserDialog({ email: initialEmail = '', teamId, onClose }: { email?: string; teamId?: string; onClose: () => void }) {
	const teams = useTeams() ?? [];
	const organisers = useOrganisers(useMe()) ?? [];
	const [email, setEmail] = useState(initialEmail);
	const [role, setRole] = useState<Role>('organiser');
	const [team, setTeam] = useState(teamId ?? (initialEmail ? NEW_TEAM : (teams[0]?.id ?? '')));
	const taken = looksLikeEmail(email) && isOrganiser(organisers, email);
	const valid = looksLikeEmail(email) && !taken && (role === 'super-admin' || team !== '');

	return (
		<Dialog title="Add organiser" description="They can sign in once you add them." onClose={onClose} className="w-[450px]" closeButton={<CloseButton onClose={onClose} />}>
			<form
				className="flex flex-col gap-5"
				onSubmit={(e) => {
					e.preventDefault();
					if (!valid) return;
					const address = email.trim();
					inviteOrganiser(address, role, teamIdFor(team)).catch(() => showToast(`Couldn’t add ${address}. Try again.`));
					showToast(`Invite sent to ${address}`);
					onClose();
				}}
			>
				<TextField
					label="Email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="sam@example.com"
					autoComplete="off"
					error={taken ? 'This person is already an organiser.' : null}
					data-autofocus
				/>
				<RoleAndTeam role={role} team={team} setRole={setRole} setTeam={setTeam} />
				<div className="flex items-center gap-4 rounded-lg bg-light-blue px-5 py-4">
					<img src={mail} alt="" width={18} height={18} />
					<p className="min-w-0 flex-1 text-sm leading-normal tracking-tight">
						We’ll email {looksLikeEmail(email) ? <strong className="font-bold">{email.trim()}</strong> : 'them'} an invite. They can sign in with Google or an email link.
					</p>
				</div>
				<Actions onCancel={onClose} submit="Send invite" disabled={!valid} />
			</form>
		</Dialog>
	);
}

const LAST_SUPER_ADMIN = 'Someone else needs to be a super admin, and to have signed in, before you change this. Otherwise nobody could manage organisers.';

/** A super admin edits someone's name, address, role and team; their own included. */
export function EditOrganiserDialog({ organiser, onClose }: { organiser: Organiser; onClose: () => void }) {
	const teams = useTeams() ?? [];
	const session = useSession();
	const self = session?.email === organiser.email;
	const [name, setName] = useState(organiser.name ?? '');
	const [email, setEmail] = useState(organiser.email);
	const [role, setRole] = useState<Role>(organiser.role);
	const [team, setTeam] = useState(organiser.teamId ?? (needsTeam(organiser) ? NEW_TEAM : (teams[0]?.id ?? '')));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<OrganiserChangeError | null>(null);
	const shown = organiser.name ?? organiser.email;
	const address = email.trim().toLowerCase();
	const moving = address !== organiser.email;
	const valid = looksLikeEmail(email) && (role === 'super-admin' || team !== '');

	return (
		<Dialog
			title={self ? 'Edit your details' : `Edit ${shown}`}
			description="Changes apply straight away."
			onClose={onClose}
			className="w-[450px]"
			closeButton={<CloseButton onClose={onClose} />}
		>
			<form
				className="flex flex-col gap-5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!valid || saving) return;
					setSaving(true);
					setError(null);
					const result = await updateOrganiser(organiser.id, { role, teamId: teamIdFor(team), name: name.trim() || null, email: address });
					setSaving(false);
					if (result) return setError(result);
					if (moving) showToast(self ? `Sign in with ${address} from now on` : `Invite sent to ${address}`);
					onClose();
					// Your own record has moved: this address can't use the dashboard any more
					if (self && moving) signOut();
				}}
			>
				<TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={organiser.invited ? 'Set when they first sign in' : ''} autoComplete="off" data-autofocus />
				<TextField
					label="Email"
					type="email"
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						if (error === 'email-taken') setError(null);
					}}
					autoComplete="off"
					error={error === 'email-taken' ? 'This address is already on the list.' : null}
					hint={
						moving
							? self
								? 'You’ll be signed out, then sign in with the new address. The old one stops working.'
								: 'They get an invite at the new address, and the old one stops working.'
							: undefined
					}
				/>
				<RoleAndTeam role={role} team={team} setRole={setRole} setTeam={setTeam} />
				{(error === 'last-super-admin' || error === 'failed') && (
					<p role="alert" className="text-sm leading-normal text-error">
						{error === 'last-super-admin' ? LAST_SUPER_ADMIN : `Couldn’t save ${self ? 'your' : `${shown}’s`} changes. Try again.`}
					</p>
				)}
				<Actions onCancel={onClose} submit={saving ? 'Saving…' : 'Save changes'} disabled={!valid || saving} />
			</form>
		</Dialog>
	);
}

/** A super admin takes someone off the list; themselves included, while another super admin can sign in. */
export function RemoveOrganiserDialog({ organiser, onClose }: { organiser: Organiser; onClose: () => void }) {
	const session = useSession();
	const self = session?.email === organiser.email;
	const name = organiser.name ?? organiser.email;
	const teams = useTeams();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<OrganiserChangeError | null>(null);
	const scope =
		organiser.role === 'super-admin' ? 'every event and team' : organiser.teamId ? `${teamName(teams, organiser.teamId)}’s events` : 'the dashboard';
	return (
		<Dialog
			title={self ? 'Remove yourself?' : `Remove ${name}?`}
			description={
				self
					? `You lose access to ${scope} and are signed out straight away. Check-ins you made stay in the records.`
					: `They lose access to ${scope} straight away. Check-ins they made stay in the records.`
			}
			onClose={onClose}
			className="w-[450px]"
			closeButton={<CloseButton onClose={onClose} />}
		>
			<form
				className="flex flex-col gap-5"
				onSubmit={async (e) => {
					e.preventDefault();
					if (saving) return;
					setSaving(true);
					const result = await removeOrganiser(organiser.id);
					setSaving(false);
					if (result) return setError(result);
					onClose();
					if (self) signOut();
				}}
			>
				{error && (
					<p role="alert" className="text-sm leading-normal text-error">
						{error === 'last-super-admin' ? LAST_SUPER_ADMIN : `Couldn’t remove ${self ? 'you' : name}. Try again.`}
					</p>
				)}
				<Actions onCancel={onClose} submit={self ? 'Remove myself' : 'Remove organiser'} disabled={saving} />
			</form>
		</Dialog>
	);
}
