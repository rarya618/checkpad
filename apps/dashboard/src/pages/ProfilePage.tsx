import { buttonClass } from '@checkpad/shared/button';
import { findCountry } from '@checkpad/shared/countries';
import { useState } from 'react';
import { TextField } from '../components/Field';
import FormCard from '../components/FormCard';
import PageHeader from '../components/PageHeader';
import TeamLink from '../components/TeamLink';
import { signOut, useSession } from '../lib/auth';
import { roleLabel, saveMyName, useMe, type Organiser } from '../lib/organisers';
import { usePageArrival } from '../lib/pageTransition';
import { teamName, useTeams, type Team } from '../lib/teams';
import { showToast } from '../lib/toast';

// The signed-in organiser's own page: their name (the one thing they change here; firestore.rules),
// their address and role, their team and its link, and how they're signed in. Email, role and
// team are a super admin's to change, on Organisers.

/** What your role lets you do, in your own team's terms. */
function whatYouCanDo(me: Organiser, team: string | null) {
	if (me.role === 'super-admin') return 'You see and run every team’s events, and manage organisers and teams.';
	if (me.role === 'organiser') return `You create and edit ${team ?? 'your team'}’s events, and check people in at them.`;
	return `You check people in and add walk-ins at ${team ?? 'your team'}’s events. Its organisers create and edit them.`;
}

export default function ProfilePage() {
	usePageArrival();
	const me = useMe();
	const teams = useTeams() ?? [];
	const team = teams.find((t) => t.id === me.teamId);
	return (
		<>
			<PageHeader title="Profile" />
			<div className="flex max-w-2xl flex-col gap-5 px-6 pt-3.5 pb-7">
				<Details me={me} team={team ? team.name : me.teamId ? teamName(teams, me.teamId) : null} />
				{team && <TeamCard team={team} />}
				<SigningIn />
				{/* Which version is live, for telling apart what you see from what was just deployed */}
				<p className="text-sm leading-normal text-med-blue tabular-nums">Checkpad {import.meta.env.VITE_CHECKPAD_VERSION}</p>
			</div>
		</>
	);
}

function Details({ me, team }: { me: Organiser; team: string | null }) {
	const [name, setName] = useState(me.name ?? '');
	const [saving, setSaving] = useState(false);
	const changed = name.trim() !== (me.name ?? '') && name.trim() !== '';
	return (
		<FormCard title="Your details">
			<form
				className="flex flex-col gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					if (!changed || saving) return;
					setSaving(true);
					saveMyName(me, name)
						.then(() => showToast('Name saved'))
						.catch(() => showToast('Couldn’t save your name. Try again.'))
						.finally(() => setSaving(false));
				}}
			>
				<div className="flex items-end gap-3">
					<TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="min-w-0 flex-1" />
					{/* As tall as the text box beside it (48px) */}
					<button type="submit" disabled={!changed || saving} className={`${buttonClass('secondary')} h-12 shrink-0 disabled:opacity-50`}>
						Save
					</button>
				</div>
				<p className="text-sm leading-normal text-med-blue">Other organisers see it on the Organisers page.</p>
			</form>
			<dl className="flex flex-col gap-4 border-t border-light-blue pt-4 leading-normal">
				<div className="flex flex-col gap-0.5">
					<dt className="text-sm text-dark-blue">Email</dt>
					<dd className="flex flex-col gap-0.5">
						<span className="break-all text-base font-bold text-dark-blue">{me.email}</span>
						<span className="text-sm text-med-blue">{me.role === 'super-admin' ? 'You can change it from Organisers.' : 'A super admin can change it for you.'}</span>
					</dd>
				</div>
				<div className="flex flex-col gap-0.5">
					<dt className="text-sm text-dark-blue">Role</dt>
					<dd className="flex flex-col gap-0.5">
						<span className="text-base font-bold text-dark-blue">
							{roleLabel(me.role)}
							{team && me.role !== 'super-admin' ? ` · ${team}` : ''}
						</span>
						<span className="text-sm text-med-blue">{whatYouCanDo(me, team)}</span>
					</dd>
				</div>
			</dl>
		</FormCard>
	);
}

function TeamCard({ team }: { team: Team }) {
	const place = [team.city, findCountry(team.country)?.name].filter(Boolean).join(', ');
	return (
		<FormCard title="Your team" description={place ? `${team.name} · ${place}` : team.name}>
			{/* TeamLink lays itself out by the card's width */}
			<div className="@container">
				<TeamLink team={team} />
			</div>
		</FormCard>
	);
}

function SigningIn() {
	const session = useSession();
	if (!session) return null;
	return (
		<FormCard title="Signing in" description={`Signed in as ${session.email}, with ${session.method === 'google' ? 'Google' : 'an email link'}.`}>
			<div className="flex flex-wrap gap-3">
				{/* Both sign out: Switch account says why you'd want to */}
				<button type="button" onClick={signOut} className={buttonClass('secondary')}>
					Switch account
				</button>
				<button type="button" onClick={signOut} className={buttonClass('secondary')}>
					Sign out
				</button>
			</div>
		</FormCard>
	);
}
