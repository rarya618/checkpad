import { buttonClass } from '@checkpad/shared/button';
import { useState } from 'react';
import { TextField } from '../components/Field';
import TeamPlaceFields from '../components/TeamPlaceFields';
import { signOut, useSession } from '../lib/auth';
import { WEB_HOST } from '../lib/config';
import { cleanSlug, slugify } from '../lib/eventForm';
import { useMe } from '../lib/organisers';
import { setUpTeam, useTeams } from '../lib/teams';
import { AuthLayout } from './SignInPages';

// Not in Figma. The first time an organiser invited to start a new team signs in, they give
// their name, then name the team and say where it meets, before anything else (RequireOrganiser,
// App.tsx). Laid out like the sign-in pages: the logo above one card.
export default function OnboardingPage() {
	const session = useSession();
	const teams = useTeams() ?? [];
	// Filled in from Google, if they signed in with it; an email link leaves it empty
	const [yourName, setYourName] = useState(useMe().name ?? '');
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugEdited, setSlugEdited] = useState(false);
	const [place, setPlace] = useState({ country: '', city: '', timeZone: '' });
	const [busy, setBusy] = useState(false);
	// What the server refused, for the value it refused
	const [refused, setRefused] = useState<{ name?: string; slug?: string; failed?: boolean }>({});

	const cleanName = name.trim();
	const cleanSlugValue = slug.replace(/-+$/, '');
	const nameTaken = refused.name === cleanName || teams.some((t) => t.name.toLowerCase() === cleanName.toLowerCase());
	const slugTaken = refused.slug === cleanSlugValue || teams.some((t) => t.slug === cleanSlugValue);
	const valid = yourName.trim() !== '' && cleanName !== '' && cleanSlugValue !== '' && place.country !== '' && !nameTaken && !slugTaken;

	return (
		<AuthLayout title="Set up your team" description="Tell us who you are and the team you run events for. Attendees see the team’s name when they check in.">
			<form
				className="flex flex-col gap-[18px]"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!valid || busy) return;
					setBusy(true);
					const error = await setUpTeam(yourName.trim(), { name: cleanName, slug: cleanSlugValue, ...place, city: place.city.trim() });
					// Saved: your entry updates with the team and the dashboard takes over from here
					if (!error) return;
					setBusy(false);
					if (error === 'name-taken') setRefused({ name: cleanName });
					else if (error === 'slug-taken') setRefused({ slug: cleanSlugValue });
					else setRefused({ failed: true });
				}}
			>
				<TextField
					label="Your name"
					value={yourName}
					onChange={(e) => setYourName(e.target.value)}
					placeholder="Jane Doe"
					autoComplete="name"
					maxLength={200}
					autoFocus={!yourName}
				/>
				<TextField
					label="Team name"
					value={name}
					onChange={(e) => {
						setName(e.target.value);
						if (!slugEdited) setSlug(slugify(e.target.value));
					}}
					placeholder="Tech Meetup"
					error={nameTaken ? 'Another team has this name.' : null}
					// Your name's already there from Google: start on the team
					autoFocus={Boolean(yourName)}
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
					hint={`Printed signs will use ${WEB_HOST}/team/${cleanSlugValue || 'link-name'}.`}
					error={slugTaken ? 'Another team uses this link.' : null}
				/>
				<TeamPlaceFields value={place} onChange={setPlace} required />
				{refused.failed && (
					<p role="alert" className="text-[13.5px] leading-[1.5] text-error">
						Couldn’t create your team. Check your connection and try again.
					</p>
				)}
				<button type="submit" disabled={!valid || busy} className={`w-full ${buttonClass('primary')} disabled:opacity-50`}>
					Create team
				</button>
			</form>
			<p className="text-xs leading-[1.5] text-med-blue">
				Signed in as {session?.email}.{' '}
				<button type="button" onClick={signOut} className="font-semibold underline">
					Sign out
				</button>
			</p>
		</AuthLayout>
	);
}
