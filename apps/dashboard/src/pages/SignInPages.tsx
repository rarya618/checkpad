import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import google from '../assets/google.svg';
import { TextField } from '../components/Field';
import Loading from '../components/Loading';
import { completeSignInLink, emulatorSignInLink, lastLinkEmail, sendSignInLink, signInWithGoogle, signOut, useSession } from '../lib/auth';
import { looksLikeEmail } from '../lib/checkIn';
import { WEB_URL } from '../lib/config';
import { usingEmulators } from '../lib/firebase';
import { useCurrentOrganiser } from '../lib/organisers';

// Figma "Sign in", "Sign in – check your email", "Sign in – link expired" and "No access",
// at the dashboard's 75% scale: the logo above one card.

export function AuthLayout({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
	return (
		<main className="flex min-h-dvh items-center justify-center p-6">
			<div className="flex w-full max-w-[390px] flex-col items-center gap-[30px]">
				<img src={logo} alt="checkpad" width={281} height={67} />
				<section className="flex w-full flex-col gap-[21px] rounded-xl border border-med-blue bg-white p-9">
					<div className="flex flex-col gap-[7.5px]">
						<h1 className="font-display text-[27px] leading-[1.2]">{title}</h1>
						<p className="text-[15px] leading-[1.5] text-med-blue">{description}</p>
					</div>
					{children}
				</section>
			</div>
		</main>
	);
}

const footnote = 'text-xs leading-[1.5] text-med-blue';

// The marketing site's waitlist, for people who aren't organisers yet. Offered to everyone, never
// based on whether an email is on the list, so these pages can't be used to look up organisers.
const waitlist = (
	<a href={`${WEB_URL.replace(/\/$/, '')}/#waitlist`} className="font-semibold underline">
		Join the waitlist
	</a>
);

/** Where to go after signing in: back to the page that asked, else Events. */
function useNext() {
	const [params] = useSearchParams();
	const next = params.get('next');
	return next?.startsWith('/') && !next.startsWith('//') ? next : '/events';
}

export function SignInPage() {
	const session = useSession();
	const navigate = useNavigate();
	const next = useNext();
	const [email, setEmail] = useState('');
	const [busy, setBusy] = useState(false);
	const [googleError, setGoogleError] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);
	if (session === undefined) return <Loading />;
	if (session) return <Navigate to={next} replace />;

	return (
		<AuthLayout title="Sign in" description="The dashboard is for event organisers. Use the email address your organiser added.">
			<button
				type="button"
				onClick={async () => {
					setGoogleError(null);
					setGoogleError(await signInWithGoogle());
				}}
				className="flex items-center justify-center gap-[10.5px] rounded-[9px] border border-dark-blue bg-white px-[18px] py-[10.5px] font-display text-[16.5px] leading-[1.5] transition-colors hover:bg-off-white"
			>
				<img src={google} alt="" width={18} height={18} />
				Continue with Google
			</button>
			{googleError && (
				<p role="alert" className="text-[13.5px] leading-[1.5] text-error">
					{googleError}
				</p>
			)}
			<div className="flex items-center gap-3" aria-hidden="true">
				<span className="h-px flex-1 bg-light-blue" />
				<span className="text-[13.5px] leading-[1.5] text-med-blue">or</span>
				<span className="h-px flex-1 bg-light-blue" />
			</div>
			<form
				className="flex flex-col gap-3"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!looksLikeEmail(email) || busy) return;
					setBusy(true);
					const error = await sendSignInLink(email, next);
					setBusy(false);
					setEmailError(error);
					if (!error) navigate(`/sign-in/check-email?${new URLSearchParams({ email: email.trim(), next })}`);
				}}
			>
				<TextField
					label="Email"
					type="email"
					autoComplete="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="you@example.com"
					error={emailError}
				/>
				<button type="submit" disabled={!looksLikeEmail(email) || busy} className={`w-full ${buttonClass('primary')} disabled:opacity-50`}>
					Email me a sign-in link
				</button>
			</form>
			<p className={footnote}>
				Checking in to an event? You don’t need to sign in. Use the link from your organiser. New to Checkpad? {waitlist}.
			</p>
		</AuthLayout>
	);
}

export function CheckEmailPage() {
	const [params] = useSearchParams();
	const email = params.get('email') ?? '';
	const next = useNext();
	const [wait, setWait] = useState(60);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	useEffect(() => {
		if (wait <= 0) return;
		const t = setTimeout(() => setWait((w) => w - 1), 1000);
		return () => clearTimeout(t);
	}, [wait]);
	if (!looksLikeEmail(email)) return <Navigate to="/sign-in" replace />;

	return (
		<AuthLayout
			title="Check your email"
			description={`If ${email} is on the organiser list, we’ve sent it a sign-in link. Open it on this device to finish signing in. It expires in 1 hour.`}
		>
			<Link to={`/sign-in?${new URLSearchParams({ next })}`} className={`w-full ${buttonClass('secondary')}`}>
				Use a different email
			</Link>
			<p className={footnote} aria-live="polite">
				Didn’t get it? Check your spam folder, or{' '}
				{wait > 0 ? (
					`send the link again in ${wait} second${wait === 1 ? '' : 's'}.`
				) : (
					<button
						type="button"
						onClick={async () => {
							setWait(60);
							setError(await sendSignInLink(email, next));
						}}
						className="font-semibold underline"
					>
						send the link again
					</button>
				)}
				{wait > 0 ? '' : '.'}
			</p>
			<p className={footnote}>
				Nothing after a few minutes? Use the address your organiser added, or ask a super admin to add you. New to Checkpad? {waitlist}.
			</p>
			{error && (
				<p role="alert" className="text-[13.5px] leading-[1.5] text-error">
					{error}
				</p>
			)}
			{/* The Auth emulator sends no email: open the link it keeps instead */}
			{usingEmulators && (
				<p className="border-t border-dashed border-light-blue pt-3 text-xs text-med-blue">
					Emulator:{' '}
					<button
						type="button"
						onClick={async () => {
							const link = await emulatorSignInLink(email);
							if (link) navigate(link);
						}}
						className="font-semibold underline"
					>
						open the link
					</button>{' '}
					· <Link to="/sign-in/link" className="font-semibold underline">open an expired link</Link>
				</p>
			)}
		</AuthLayout>
	);
}

/** Where the emailed link lands: signs in, or explains why it can't. */
export function SignInLinkPage() {
	const next = useNext();
	const [result, setResult] = useState<'signed-in' | 'expired'>();
	const [resend, setResend] = useState(lastLinkEmail);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		completeSignInLink().then(setResult);
	}, []);

	if (result === undefined) return <Loading />;
	if (result === 'signed-in') return <Navigate to={next} replace />;
	return (
		<AuthLayout title="This sign-in link has expired" description="Sign-in links work once and expire after an hour. Send yourself a new one.">
			<form
				className="flex flex-col gap-[21px]"
				onSubmit={async (e) => {
					e.preventDefault();
					if (!looksLikeEmail(resend) || busy) return;
					setBusy(true);
					const failed = await sendSignInLink(resend, next);
					setBusy(false);
					setError(failed);
					if (!failed) navigate(`/sign-in/check-email?${new URLSearchParams({ email: resend.trim(), next })}`);
				}}
			>
				<TextField label="Email" type="email" autoComplete="email" value={resend} onChange={(e) => setResend(e.target.value)} error={error} />
				<button type="submit" disabled={!looksLikeEmail(resend) || busy} className={`w-full ${buttonClass('primary')} disabled:opacity-50`}>
					Send a new link
				</button>
			</form>
			<p className={footnote}>Opened the link on a different device? Open it on the one you requested it from, or send a new link here.</p>
		</AuthLayout>
	);
}

export function NoAccessPage() {
	const session = useSession();
	const me = useCurrentOrganiser();
	if (session === null) return <Navigate to="/sign-in" replace />;
	if (me) return <Navigate to="/events" replace />;
	if (!session || me === undefined) return <Loading />;
	const name = session.name ?? session.email;
	const initials = (session.name ?? session.email)
		.split(/[\s.@]+/)
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	return (
		<AuthLayout
			title="You don’t have access yet"
			description={`${session.email} isn’t on the organiser list. Ask a super admin to add it, then sign in again.`}
		>
			<div className="flex items-center gap-[10.5px] rounded-[7.5px] bg-off-white px-3 py-[10.5px]">
				<span aria-hidden="true" className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-xs">
					{initials}
				</span>
				<div className="flex min-w-0 flex-col gap-[1.5px] leading-[1.5] text-black">
					<p className="truncate font-display text-[15px]">{name}</p>
					<p className="truncate text-[13.5px]">{session.email}</p>
				</div>
			</div>
			<button type="button" onClick={signOut} className={`w-full ${buttonClass('primary')}`}>
				Use another account
			</button>
			<p className={footnote}>
				Signed in with the wrong account? Sign out and try again. Not part of an organising team? {waitlist}.
			</p>
		</AuthLayout>
	);
}
