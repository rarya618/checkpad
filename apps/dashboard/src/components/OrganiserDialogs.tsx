import { buttonClass } from '@checkpad/shared/button';
import { useState, type ReactNode } from 'react';
import mail from '../assets/mail.svg';
import x from '../assets/x.svg';
import { looksLikeEmail } from '../lib/checkIn';
import { inviteOrganiser, isOrganiser, removeOrganiser, roles, updateOrganiser, useMe, useOrganisers, type Organiser, type Role } from '../lib/organisers';
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

/** Role and team selects (team IDs); super admins see every team, so their team is fixed to "All teams". */
function RoleAndTeam({ role, team, setRole, setTeam }: { role: Role; team: string; setRole: (r: Role) => void; setTeam: (t: string) => void }) {
	const teams = useTeams() ?? [];
	return (
		<>
			<SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)} hint={`${roles.find((r) => r.id === role)!.description}.`}>
				{roles.map((r) => (
					<option key={r.id} value={r.id}>
						{r.label}
					</option>
				))}
			</SelectField>
			<SelectField label="Team" value={role === 'super-admin' ? '' : team} disabled={role === 'super-admin'} onChange={(e) => setTeam(e.target.value)} className="has-disabled:opacity-60">
				{role === 'super-admin' && <option value="">All teams</option>}
				{teams.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</SelectField>
		</>
	);
}

export function AddOrganiserDialog({ onClose }: { onClose: () => void }) {
	const teams = useTeams() ?? [];
	const organisers = useOrganisers(useMe()) ?? [];
	const [email, setEmail] = useState('');
	const [role, setRole] = useState<Role>('organiser');
	const [team, setTeam] = useState(teams[0]?.id ?? '');
	const taken = looksLikeEmail(email) && isOrganiser(organisers, email);
	const valid = looksLikeEmail(email) && !taken && (role === 'super-admin' || team !== '');

	return (
		<Dialog title="Add organiser" description="They can sign in once you add them." onClose={onClose} className="w-[450px]" closeButton={<CloseButton onClose={onClose} />}>
			<form
				className="flex flex-col gap-[18px]"
				onSubmit={(e) => {
					e.preventDefault();
					if (!valid) return;
					const address = email.trim();
					inviteOrganiser(address, role, team).catch(() => showToast(`Couldn’t add ${address}. Try again.`));
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
				<div className="flex items-center gap-[15px] rounded-[7.5px] bg-light-blue px-[18px] py-[15px]">
					<img src={mail} alt="" width={18} height={18} />
					<p className="min-w-0 flex-1 text-[13.5px] leading-[1.5] tracking-[-0.3px]">
						We’ll email {looksLikeEmail(email) ? <strong className="font-bold">{email.trim()}</strong> : 'them'} an invite. They can sign in with Google or an email link.
					</p>
				</div>
				<Actions onCancel={onClose} submit="Send invite" disabled={!valid} />
			</form>
		</Dialog>
	);
}

export function EditOrganiserDialog({ organiser, onClose }: { organiser: Organiser; onClose: () => void }) {
	const teams = useTeams() ?? [];
	const [role, setRole] = useState<Role>(organiser.role);
	const [team, setTeam] = useState(organiser.teamId ?? teams[0]?.id ?? '');
	const name = organiser.name ?? organiser.email;

	return (
		<Dialog
			title={`Edit ${name}`}
			description="Changes apply the next time they load a page."
			onClose={onClose}
			className="w-[450px]"
			closeButton={<CloseButton onClose={onClose} />}
		>
			<form
				className="flex flex-col gap-[18px]"
				onSubmit={(e) => {
					e.preventDefault();
					updateOrganiser(organiser.id, { role, teamId: team || null }).catch(() => showToast(`Couldn’t save ${name}’s changes. Try again.`));
					onClose();
				}}
			>
				<TextField
					label="Email"
					value={organiser.email}
					readOnly
					hint="To change the email, remove them and add the new address."
					className="opacity-60"
				/>
				<RoleAndTeam role={role} team={team} setRole={setRole} setTeam={setTeam} />
				<Actions onCancel={onClose} submit="Save changes" />
			</form>
		</Dialog>
	);
}

export function RemoveOrganiserDialog({ organiser, onClose }: { organiser: Organiser; onClose: () => void }) {
	const name = organiser.name ?? organiser.email;
	const teams = useTeams();
	const scope = organiser.teamId ? `${teamName(teams, organiser.teamId)}’s events` : 'every event and team';
	return (
		<Dialog
			title={`Remove ${name}?`}
			description={`They lose access to ${scope} straight away. Check-ins they made stay in the records.`}
			onClose={onClose}
			className="w-[450px]"
			closeButton={<CloseButton onClose={onClose} />}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					removeOrganiser(organiser.id).catch(() => showToast(`Couldn’t remove ${name}. Try again.`));
					onClose();
				}}
			>
				<Actions onCancel={onClose} submit="Remove organiser" />
			</form>
		</Dialog>
	);
}
