import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import google from '../assets/google.svg';
import Loading, { Spinner } from '../components/Loading';
import { completeSignInLink, emulatorSignInLink, lastLinkEmail, prepareGoogleSignIn, sendSignInLink, signInWithGoogle, signOut, useSession } from '../lib/auth';
import { looksLikeEmail } from '../lib/checkIn';
import { WEB_URL } from '../lib/config';
import { usingEmulators } from '../lib/firebase';
import { useCurrentOrganiser } from '../lib/organisers';
import { usePageArrival, useTransitionLink, useTransitionNavigate } from '../lib/pageTransition';

// Not the Figma cards any more: each screen asks or answers one thing in display type on the
// page's own ground, with the logo where the site's header puts it and, on the sign-in screens,
// a foot saying where everyone who isn't an organiser should go instead. Onboarding and the
// error page share the layout.

export function AuthLayout({ title, description, children, foot }: { title: string; description: ReactNode; children: ReactNode; foot?: ReactNode }) {
	usePageArrival();
	return (
		<div className="flex min-h-dvh flex-col px-6 py-6 md:px-12 md:py-8 lg:px-20">
			<img src={logo} alt="checkpad" width={146} height={32} className="self-start" />
			{/* Centred by the space above and below rather than justify-center, so an error that
			    appears under the field grows downwards instead of moving the question up the screen.
			    The space below gets twice the share, so there is room for that message on phones. A 0px
			    basis, not flex-1's 0%, which counts as the content's height here */}
			<main className="flex w-full max-w-3xl grow basis-0 flex-col gap-8 py-14 md:gap-10">
				<div className="grow basis-0" />
				<div className="flex flex-col gap-3" data-enter>
					<h1 className="font-display text-4xl leading-tight text-balance md:text-5xl lg:text-6xl">{title}</h1>
					<p className="max-w-2xl text-lg leading-normal text-pretty text-dark-blue/80 md:text-xl">{description}</p>
				</div>
				<div className="flex w-full max-w-2xl grow-2 basis-0 flex-col gap-5" data-enter style={{ '--enter': 1 } as CSSProperties}>
					{children}
				</div>
			</main>
			{foot}
		</div>
	);
}

// The marketing site's waitlist, for people who aren't organisers yet. Offered to everyone, never
// based on whether an email is on the list, so these pages can't be used to look up organisers.
const waitlist = `${WEB_URL.replace(/\/$/, '')}/#waitlist`;

/** Where everyone who isn't an organiser should go instead. */
function DoorNotes() {
	return (
		<footer className="flex flex-col gap-3 border-t-2 border-light-blue pt-4 text-sm leading-normal text-med-blue md:flex-row md:gap-12">
			<p>
				<strong className="font-semibold text-dark-blue">Checking in to an event?</strong> You don’t need to sign in. Use the link or QR code from the
				organisers.
			</p>
			<p>
				<strong className="font-semibold text-dark-blue">New to Checkpad?</strong>{' '}
				<a href={waitlist} className="underline underline-offset-2 hover:text-dark-blue">
					Join the waitlist
				</a>
			</p>
		</footer>
	);
}

const help = 'text-base leading-normal text-med-blue';
const textLink = 'font-semibold text-dark-blue underline underline-offset-4 decoration-light-blue-hover hover:decoration-dark-blue';
const alert = 'text-base leading-normal text-error';

/** One large email field with its button beside it (under it on phones). */
function EmailForm({
	initial = '',
	action,
	onSend,
}: {
	initial?: string;
	action: string;
	/** Sends the link; resolves to an error message, or null once it's sent. */
	onSend: (email: string) => Promise<string | null>;
}) {
	const id = useId();
	const [email, setEmail] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	return (
		<form
			noValidate
			className="flex flex-col gap-3 sm:flex-row sm:items-start"
			onSubmit={async (e) => {
				e.preventDefault();
				if (busy) return;
				if (!looksLikeEmail(email)) return setError('Enter your email address, like you@example.com.');
				setBusy(true);
				const failed = await onSend(email.trim());
				setBusy(false);
				setError(failed);
			}}
		>
			<label htmlFor={id} className="sr-only">
				Email
			</label>
			{/* The error sits under the field, so it stays beside it when the button stacks on phones */}
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<input
					id={id}
					type="email"
					autoComplete="email"
					autoFocus={!initial}
					value={email}
					onChange={(e) => {
						setEmail(e.target.value);
						setError(null);
					}}
					placeholder="you@example.com"
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? `${id}-error` : undefined}
					className="min-w-0 flex-1 rounded-xl bg-white px-5 py-3 text-lg leading-normal text-dark-blue caret-med-blue shadow-[inset_0_0_0_1px_rgb(17_45_78/0.2)] outline-none placeholder:text-dark-blue/65 focus:outline-2 focus:outline-offset-2 focus:outline-med-blue aria-invalid:shadow-[inset_0_0_0_2px_var(--color-error)]"
				/>
				{error && (
					<p id={`${id}-error`} role="alert" className={alert}>
						{error}
					</p>
				)}
			</div>
			<button type="submit" aria-busy={busy} className={`relative ${buttonClass('primary', 'tall')}`}>
				<span className={busy ? 'invisible' : undefined}>{action}</span>
				{busy && (
					<span className="absolute inset-0 flex items-center justify-center">
						<Spinner className="text-off-white" />
						<span role="status" className="sr-only">
							Sending
						</span>
					</span>
				)}
			</button>
		</form>
	);
}

/** Where to go after signing in: back to the page that asked, else Events. */
function useNext() {
	const [params] = useSearchParams();
	const next = params.get('next');
	return next?.startsWith('/') && !next.startsWith('//') ? next : '/events';
}

const checkEmailPath = (email: string, next: string) => `/sign-in/check-email?${new URLSearchParams({ email, next })}`;

export function SignInPage() {
	const session = useSession();
	const go = useTransitionNavigate();
	const next = useNext();
	const [googleError, setGoogleError] = useState<string | null>(null);
	useEffect(prepareGoogleSignIn, []);
	if (session === undefined) return <Loading />;
	if (session) return <Navigate to={next} replace />;

	return (
		<AuthLayout
			title="What’s your email?"
			description="Use the one you were invited to Checkpad with, and we’ll email you a link to sign in."
			foot={<DoorNotes />}
		>
			<EmailForm
				action="Email me a link"
				onSend={async (email) => {
					const error = await sendSignInLink(email, next);
					if (!error) go(checkEmailPath(email, next));
					return error;
				}}
			/>
			<p className={help}>
				or{' '}
				<button
					type="button"
					onClick={async () => {
						setGoogleError(null);
						setGoogleError(await signInWithGoogle());
					}}
					className={`inline-flex items-center gap-2 align-bottom ${textLink}`}
				>
					<img src={google} alt="" width={16} height={16} />
					continue with Google
				</button>
			</p>
			{googleError && (
				<p role="alert" className={alert}>
					{googleError}
				</p>
			)}
		</AuthLayout>
	);
}

export function CheckEmailPage() {
	const [params] = useSearchParams();
	const email = params.get('email') ?? '';
	const next = useNext();
	const [wait, setWait] = useState(60);
	const [error, setError] = useState<string | null>(null);
	// Said once at the moments that matter, not every second of the countdown
	const [announce, setAnnounce] = useState('');
	const navigate = useNavigate();
	const differentEmail = `/sign-in?${new URLSearchParams({ next })}`;
	const toDifferentEmail = useTransitionLink(differentEmail);
	useEffect(() => {
		if (wait <= 0) return setAnnounce('You can send it again now.');
		const t = setTimeout(() => setWait((w) => w - 1), 1000);
		return () => clearTimeout(t);
	}, [wait]);
	if (!looksLikeEmail(email)) return <Navigate to="/sign-in" replace />;

	return (
		<AuthLayout
			title="Check your email"
			description={
				<>
					If <strong className="font-semibold wrap-anywhere text-dark-blue">{email}</strong> is on the organiser list, a sign-in link is on its way. Open it on this device
					within an hour.
				</>
			}
			foot={<DoorNotes />}
		>
			<Link to={differentEmail} onClick={toDifferentEmail} className={`self-start ${buttonClass('secondary', 'tall')}`}>
				Use a different email
			</Link>
			<p className={help}>
				Not there? Check your spam folder, or{' '}
				{/* One button throughout, so focus stays on it while it counts down */}
				<button
					type="button"
					aria-disabled={wait > 0}
					onClick={async () => {
						if (wait > 0) return;
						setWait(60);
						setAnnounce('');
						const failed = await sendSignInLink(email, next);
						setError(failed);
						if (!failed) setAnnounce('Sent it again.');
					}}
					className={wait > 0 ? 'cursor-not-allowed' : textLink}
				>
					{wait > 0 ? (
						<>
							send it again in <span className="tabular-nums">{wait}</span> second{wait === 1 ? '' : 's'}
						</>
					) : (
						'send it again'
					)}
				</button>
				. Still nothing? Ask a super admin to check which address they invited.
			</p>
			<p role="status" className="sr-only">
				{announce}
			</p>
			{error && (
				<p role="alert" className={alert}>
					{error}
				</p>
			)}
			{/* The Auth emulator sends no email: open the link it keeps instead */}
			{usingEmulators && (
				<p className="border-t border-dashed border-light-blue pt-3 text-sm text-med-blue">
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
					·{' '}
					<Link to="/sign-in/link" className="font-semibold underline">
						open an expired link
					</Link>
				</p>
			)}
		</AuthLayout>
	);
}

/** Where the emailed link lands: signs in, or explains why it can't. */
export function SignInLinkPage() {
	const next = useNext();
	const [result, setResult] = useState<'signed-in' | 'expired'>();
	const go = useTransitionNavigate();

	useEffect(() => {
		completeSignInLink().then(setResult);
	}, []);

	if (result === undefined) return <Loading />;
	if (result === 'signed-in') return <Navigate to={next} replace />;
	return (
		<AuthLayout title="This link has expired" description="Sign-in links work once, for an hour. Send yourself a new one." foot={<DoorNotes />}>
			<EmailForm
				initial={lastLinkEmail()}
				action="Send a new link"
				onSend={async (email) => {
					const error = await sendSignInLink(email, next);
					if (!error) go(checkEmailPath(email, next));
					return error;
				}}
			/>
			<p className={help}>Opened it on another device? Open it on the one you asked from, or send a new link here.</p>
		</AuthLayout>
	);
}

export function NoAccessPage() {
	const session = useSession();
	const me = useCurrentOrganiser();
	if (session === null) return <Navigate to="/sign-in" replace />;
	if (me) return <Navigate to="/events" replace />;
	if (!session || me === undefined) return <Loading />;
	// From the name, or the part of the email before the @ (not the domain)
	const initials = (session.name?.trim() || session.email.split('@')[0])
		.split(/[\s._-]+/)
		.filter(Boolean)
		.map((p) => p[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();

	return (
		<AuthLayout
			title="You don’t have access yet"
			description="This account isn’t on the organiser list. Ask a super admin to add it, then sign in again."
			foot={<DoorNotes />}
		>
			<div className="flex min-w-0 items-center gap-3">
				<span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-sm">
					{initials}
				</span>
				<div className="flex min-w-0 flex-col leading-normal">
					{session.name && <p className="truncate font-display text-base">{session.name}</p>}
					<p className="text-base wrap-anywhere text-dark-blue/80">{session.email}</p>
				</div>
			</div>
			<button type="button" onClick={signOut} className={`self-start ${buttonClass('primary', 'tall')}`}>
				Use another account
			</button>
		</AuthLayout>
	);
}
