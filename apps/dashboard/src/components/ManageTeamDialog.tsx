import { buttonClass } from '@checkpad/shared/button';
import { countries } from '@checkpad/shared/countries';
import { useState } from 'react';
import xSmall from '../assets/x-small.svg';
import x from '../assets/x.svg';
import { looksLikeEmail } from '../lib/checkIn';
import { WEB_HOST } from '../lib/config';
import { cleanSlug, slugify } from '../lib/eventForm';
import { initialsOf, isOrganiser, roleLabel, saveTeamMembers, useMe, useOrganisers } from '../lib/organisers';
import { useTeams, type Team } from '../lib/teams';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';
import { SelectField, TextField } from './Field';

// Figma "Organisers – manage team", at 75% scale. Also used for New team (not designed),
// starting empty. Nothing changes until Save team. Delete team (not designed) opens its own dialog.
export default function ManageTeamDialog({ team, onClose, onDelete }: { team: Team | null; onClose: () => void; onDelete: () => void }) {
	const teams = useTeams() ?? [];
	const organisers = useOrganisers(useMe()) ?? [];
	const [name, setName] = useState(team?.name ?? '');
	const [slug, setSlug] = useState(team?.slug ?? '');
	const [slugEdited, setSlugEdited] = useState(team !== null);
	const [country, setCountry] = useState(team?.country ?? '');
	const [removed, setRemoved] = useState<string[]>([]);
	const [invites, setInvites] = useState<string[]>([]);
	const [newEmail, setNewEmail] = useState('');

	const members = organisers.filter((o) => team && o.teamId === team.id && !removed.includes(o.id));
	const cleanName = name.trim();
	const cleanSlugValue = slug.replace(/-+$/, '');
	const nameTaken = teams.some((t) => t.id !== team?.id && t.name.toLowerCase() === cleanName.toLowerCase());
	const slugTaken = teams.some((t) => t.id !== team?.id && t.slug === cleanSlugValue);
	const valid = cleanName !== '' && cleanSlugValue !== '' && !nameTaken && !slugTaken;
	const emailTaken = looksLikeEmail(newEmail) && (isOrganiser(organisers, newEmail) || invites.includes(newEmail.trim().toLowerCase()));

	function addMember() {
		if (!looksLikeEmail(newEmail) || emailTaken) return;
		setInvites([...invites, newEmail.trim().toLowerCase()]);
		setNewEmail('');
	}

	return (
		<Dialog
			title={team ? 'Manage team' : 'New team'}
			description="Members can see and run this team’s events."
			onClose={onClose}
			className="w-[480px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<form
				className="flex flex-col gap-[18px]"
				onSubmit={(e) => {
					e.preventDefault();
					if (!valid) return;
					saveTeamMembers(team, { name: cleanName, slug: cleanSlugValue, country }, removed, invites.map((email) => ({ email, role: 'team-member' }))).then(
						() => {
							if (invites.length) showToast(invites.length === 1 ? `Invite sent to ${invites[0]}` : `Invites sent to ${invites.length} people`);
						},
						() => showToast(`Couldn’t save ${cleanName}. Try again.`),
					);
					onClose();
				}}
			>
				<div className="flex flex-col gap-3">
					<div className="flex gap-3">
						<TextField
							label="Team name"
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								if (!slugEdited) setSlug(slugify(e.target.value));
							}}
							placeholder="Tech Meetup"
							error={nameTaken ? 'Another team has this name.' : null}
							className="min-w-0 flex-1"
							data-autofocus
						/>
						<TextField
							label="Link name"
							value={slug}
							onChange={(e) => {
								setSlugEdited(true);
								setSlug(cleanSlug(e.target.value));
							}}
							placeholder="tech-meetup"
							spellCheck={false}
							error={slugTaken ? 'Another team uses this link.' : null}
							className="min-w-0 flex-1"
						/>
					</div>
					<p className="text-xs leading-[1.5] text-med-blue">
						{team
							? `Changing the link name breaks printed signs that use ${WEB_HOST}/team/${team.slug}.`
							: `Printed signs will use ${WEB_HOST}/team/${cleanSlugValue || 'link-name'}.`}
					</p>
				</div>
				<CountryField value={country} onChange={setCountry} />

				{(members.length > 0 || invites.length > 0) && (
					<div className="flex flex-col gap-[3px]">
						<p className="text-[13.5px] leading-[1.5] text-black">Members</p>
						<ul className="flex flex-col">
							{members.map((o) => (
								<Member
									key={o.id}
									initials={initialsOf(o)}
									name={o.name ?? o.email}
									detail={o.invited ? 'Invited' : o.email}
									invited={o.invited}
									role={roleLabel(o.role)}
									onRemove={() => setRemoved([...removed, o.id])}
								/>
							))}
							{invites.map((email) => (
								<Member
									key={email}
									initials={email.slice(0, 2).toUpperCase()}
									name={email}
									detail="Invited when you save"
									invited
									role={roleLabel('team-member')}
									onRemove={() => setInvites(invites.filter((i) => i !== email))}
								/>
							))}
						</ul>
					</div>
				)}

				<div className="flex items-end gap-3">
					<TextField
						label="Add member"
						type="email"
						value={newEmail}
						onChange={(e) => setNewEmail(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								addMember();
							}
						}}
						placeholder="Email address"
						autoComplete="off"
						error={emailTaken ? 'Already an organiser.' : null}
						className="min-w-0 flex-1"
					/>
					<button type="button" onClick={addMember} disabled={!looksLikeEmail(newEmail) || emailTaken} className={`${buttonClass('secondary')} disabled:opacity-50 ${emailTaken ? 'mb-[22px]' : ''}`}>
						Add
					</button>
				</div>

				<div className="flex justify-end gap-3">
					{team && (
						<button type="button" onClick={onDelete} className={`${buttonClass('secondary')} mr-auto whitespace-nowrap`}>
							Delete team
						</button>
					)}
					<button type="button" onClick={onClose} className={`${buttonClass('secondary')} whitespace-nowrap`}>
						Cancel
					</button>
					<button type="submit" disabled={!valid} className={`${buttonClass('primary')} whitespace-nowrap disabled:opacity-50`}>
						{team ? 'Save team' : 'Create team'}
					</button>
				</div>
			</form>
		</Dialog>
	);
}

function Member({ initials, name, detail, invited, role, onRemove }: { initials: string; name: string; detail: string; invited: boolean; role: string; onRemove: () => void }) {
	return (
		<li className="flex items-center gap-[10.5px] py-[4.5px]">
			<span aria-hidden="true" className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-xs">
				{initials}
			</span>
			<div className="flex min-w-0 flex-1 flex-col leading-[1.5]">
				<p className="truncate text-[13.5px] font-bold text-black">{name}</p>
				<p className={`truncate text-xs ${invited ? 'text-med-blue' : 'text-black'}`}>{detail}</p>
			</div>
			<span className="shrink-0 rounded-full bg-light-blue px-[9px] py-[3px] text-[10.5px] leading-[1.5] font-bold">{role}</span>
			<button type="button" aria-label={`Remove ${name} from the team`} onClick={onRemove} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
				<img src={xSmall} alt="" width={15} height={15} />
			</button>
		</li>
	);
}

/**
 * Also on onboarding (OnboardingPage), where it's `required`. Empty for a team from before teams
 * had a country, whose new events start in Sydney time.
 */
export function CountryField({ value, onChange, required = false }: { value: string; onChange: (code: string) => void; required?: boolean }) {
	const country = countries.find((c) => c.code === value);
	const hint = country
		? `New events start in ${country.timeZones[0].city} time. You can change it on each event.`
		: required
			? 'New events start in its time zone.'
			: 'New events start in Sydney time until you choose one.';
	return (
		<SelectField label="Country" value={value} onChange={(e) => onChange(e.target.value)} hint={hint} required={required}>
			{!country && <option value="">Choose a country</option>}
			{countries.map((c) => (
				<option key={c.code} value={c.code}>
					{c.name}
				</option>
			))}
		</SelectField>
	);
}
