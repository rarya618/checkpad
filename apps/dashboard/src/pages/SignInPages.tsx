import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useId, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import arrow from '../assets/arrow-right.svg';
import google from '../assets/google.svg';
import Loading, { Spinner } from '../components/Loading';
import {
	completeSignInLink,
	emulatorSignInCode,
	emulatorSignInLink,
	lastLinkEmail,
	prepareGoogleSignIn,
	sendSignInLink,
	signInWithCode,
	signInWithGoogle,
	signInWithGoogleIdToken,
	signOut,
	useSession,
	type LinkResult,
} from '../lib/auth';
import { looksLikeEmail } from '../lib/checkIn';
import { WEB_URL } from '../lib/config';
import { usingEmulators } from '../lib/firebase';
import { showOneTap } from '../lib/googleOneTap';
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
			<main data-on-ground className="flex w-full max-w-3xl grow basis-0 flex-col gap-8 py-14 md:gap-10">
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

const site = WEB_URL.replace(/\/$/, '');

/**
 * Where everyone who isn't an organiser should go instead: two light-blue panels, each one link.
 * The waitlist is offered to everyone, never based on whether an email is on the list, so these
 * pages can't be used to look up organisers.
 */
function DoorNotes() {
	const doors = [
		{ title: 'Here to check in?', body: 'Attendees don’t sign in. Use the event’s link or QR code from the organisers.', action: 'Help checking in', href: `${site}/help` },
		{ title: 'New to Checkpad?', body: 'It isn’t open to new organisers yet. Join the waitlist and we’ll email you.', action: 'Join the waitlist', href: `${site}/#waitlist` },
	];
	return (
		<footer className="grid w-full max-w-3xl gap-3 md:grid-cols-2">
			{doors.map((door) => (
				<a
					key={door.href}
					href={door.href}
					className="group flex flex-col gap-1 rounded-2xl bg-light-blue/50 p-5 leading-normal transition-colors hover:bg-light-blue"
				>
					<span className="font-semibold text-dark-blue">{door.title}</span>
					<span className="text-sm text-dark-blue/80">{door.body}</span>
					<span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-dark-blue">
						{door.action}
						<img src={arrow} alt="" width={16} height={16} className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
					</span>
				</a>
			))}
		</footer>
	);
}

const help = 'text-base leading-normal text-med-blue';
const textLink = 'font-semibold text-dark-blue underline underline-offset-4 decoration-light-blue-hover hover:decoration-dark-blue';
const alert = 'text-base leading-normal text-error';

/** One large field with its button beside it (under it on phones), and what went wrong under the field. */
function OneFieldForm({
	label,
	action,
	busyLabel,
	initial = '',
	check,
	onSubmit,
	submitWhen,
	narrow = false,
	shakeOnRefusal = false,
	done,
	input,
}: {
	label: string;
	action: string;
	/** Said to screen readers while it works */
	busyLabel: string;
	initial?: string;
	/** What's wrong with the value before it's sent, or null. */
	check: (value: string) => string | null;
	/** Sends it; resolves to an error message, or null when it worked. */
	onSubmit: (value: string) => Promise<string | null>;
	/** Sends without the button once the value looks complete (a pasted or autofilled code). */
	submitWhen?: (value: string) => boolean;
	/** A short value (a code): the field is only as wide as it needs, with the button right beside it. */
	narrow?: boolean;
	/** Shakes the field when onSubmit refuses the value (a wrong code), not for a typo check() catches. */
	shakeOnRefusal?: boolean;
	/** Shown in the button, with a drawn tick, once onSubmit works (it stays, as the page moves on). */
	done?: string;
	input: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>;
}) {
	const id = useId();
	const [value, setValue] = useState(initial);
	const [busy, setBusy] = useState(false);
	const [worked, setWorked] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const field = useRef<HTMLInputElement>(null);

	async function submit(text: string) {
		if (busy || worked) return;
		const problem = check(text);
		if (problem) return setError(problem);
		setBusy(true);
		const failed = await onSubmit(text.trim());
		setBusy(false);
		setError(failed);
		if (!failed && done) setWorked(true);
		// Three swings that die away, like a head shaking no: 320ms, and none with reduced motion
		if (failed && shakeOnRefusal && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
			field.current?.animate({ translate: ['0', '-6px', '5px', '-3px', '1px', '0'] }, { duration: 320, easing: 'ease-out' });
		}
	}

	return (
		<form
			noValidate
			className="flex flex-col gap-3 sm:flex-row sm:items-start"
			onSubmit={(e) => {
				e.preventDefault();
				submit(value);
			}}
		>
			<label htmlFor={id} className="sr-only">
				{label}
			</label>
			{/* The error sits under the field, so it stays beside it when the button stacks on phones */}
			<div className={`flex min-w-0 flex-col gap-2 ${narrow ? 'sm:w-56' : 'flex-1'}`}>
				<input
					{...input}
					ref={field}
					id={id}
					readOnly={worked}
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
						setError(null);
						if (submitWhen?.(e.target.value) && !submitWhen(value)) submit(e.target.value);
					}}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? `${id}-error` : undefined}
					className={`min-w-0 flex-1 rounded-xl bg-white px-5 py-3 text-lg leading-normal text-dark-blue caret-med-blue shadow-[inset_0_0_0_1px_rgb(17_45_78/0.2)] outline-none placeholder:text-dark-blue/65 focus:outline-2 focus:outline-offset-2 focus:outline-med-blue transition-shadow duration-150 aria-invalid:shadow-[inset_0_0_0_2px_var(--color-error)] ${worked ? 'shadow-[inset_0_0_0_2px_var(--color-dark-blue)]' : ''} ${input.className ?? ''}`}
				/>
				{error && (
					// Under a narrow field it runs on under the button, which is no taller than the field
					// Keyed by the message, so a new one arrives again rather than just changing
					<p key={error} data-note id={`${id}-error`} role="alert" className={`${alert} ${narrow ? 'sm:w-md' : ''}`}>
						{error}
					</p>
				)}
			</div>
			{/* Filled in already (from an invite, or a link that's expired): the button is the next step */}
			<button type="submit" aria-busy={busy} autoFocus={Boolean(initial) && !input.autoFocus} className={`relative ${buttonClass('primary', 'tall')}`}>
				{/* The labels share one cell, so the button is as wide as the longer and never changes size */}
				<span className="grid">
					<span className={`[grid-area:1/1] ${busy || worked ? 'invisible' : ''}`}>{action}</span>
					{done && (
						<span aria-hidden={!worked} className={`[grid-area:1/1] flex items-center justify-center gap-2 ${worked ? 'animate-[fade-in_150ms_ease-out]' : 'invisible'}`}>
							{worked && (
								<svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
									<path data-tick d="M3 8.5l3.2 3.2L13 5" pathLength={1} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							)}
							{done}
						</span>
					)}
				</span>
				{busy && (
					<span className="absolute inset-0 flex items-center justify-center">
						<Spinner className="text-off-white" />
						<span role="status" className="sr-only">
							{busyLabel}
						</span>
					</span>
				)}
			</button>
			<span role="status" className="sr-only">
				{worked ? done : ''}
			</span>
		</form>
	);
}

/** The email field: the first screen's question, and again when a link has expired. */
function EmailForm({ initial = '', action, onSend }: { initial?: string; action: string; onSend: (email: string) => Promise<string | null> }) {
	return (
		<OneFieldForm
			label="Email"
			action={action}
			busyLabel="Sending"
			initial={initial}
			check={(email) => (looksLikeEmail(email) ? null : 'Enter your email address, like you@example.com.')}
			onSubmit={onSend}
			input={{ type: 'email', autoComplete: 'email', autoFocus: !initial, placeholder: 'you@example.com' }}
		/>
	);
}

/** Six digits, with or without the space the email shows them with. */
const digits = (code: string) => code.replace(/\s/g, '');
const looksLikeCode = (code: string) => /^\d{6}$/.test(digits(code));

/** Where to go after signing in: back to the page that asked, else Events. */
function useNext() {
	const [params] = useSearchParams();
	const next = params.get('next');
	return next?.startsWith('/') && !next.startsWith('//') ? next : '/events';
}

/** `fromLink`: the email's link was opened on another device, so this asks for its code instead. */
const checkEmailPath = (email: string, next: string, fromLink = false) =>
	`/sign-in/check-email?${new URLSearchParams({ email, next, ...(fromLink && { from: 'link' }) })}`;

export function SignInPage() {
	const session = useSession();
	const go = useTransitionNavigate();
	const next = useNext();
	// The invite's button brings their address (?email=), so signing in is one tap
	const [params] = useSearchParams();
	const invited = params.get('email') ?? '';
	const [googleError, setGoogleError] = useState<string | null>(null);
	useEffect(prepareGoogleSignIn, []);
	// Google's "Continue as …" prompt, once we know nobody's signed in. Choosing an account signs
	// in, and the page then moves on like any other sign-in
	const signedOut = session === null;
	const hint = looksLikeEmail(invited) ? invited.trim() : '';
	useEffect(() => {
		if (!signedOut) return;
		return showOneTap(async (idToken) => {
			setGoogleError(null);
			setGoogleError(await signInWithGoogleIdToken(idToken));
		}, hint);
	}, [signedOut, hint]);
	if (session === undefined) return <Loading />;
	if (session) return <Navigate to={next} replace />;

	return (
		<AuthLayout
			title="What’s your email?"
			description="Use the one you were invited to Checkpad with, and we’ll email you a code to sign in."
			foot={<DoorNotes />}
		>
			<EmailForm
				initial={looksLikeEmail(invited) ? invited.trim() : ''}
				action="Email me a code"
				onSend={async (email) => {
					const error = await sendSignInLink(email, next);
					if (!error) go(checkEmailPath(email, next));
					return error;
				}}
			/>
			<div className={`flex items-center gap-3 ${help}`}>
				or
				{/* Google's branding rules: a bordered light-theme button (fill, 1px #747775 stroke,
				    #1F1F1F text in Google Sans Medium), 12px before the logo, 10px after it, 12px after the text */}
				<button
					type="button"
					onClick={async () => {
						setGoogleError(null);
						setGoogleError(await signInWithGoogle());
					}}
					className="flex items-center gap-2.5 rounded-full border border-[#747775] bg-white h-10 px-3 font-google font-medium text-sm leading-5 text-[#1F1F1F] transition-colors hover:bg-off-white"
				>
					<img src={google} alt="" width={18} height={18} />
					Sign in with Google
				</button>
			</div>
			{googleError && (
				<p data-note role="alert" className={alert}>
					{googleError}
				</p>
			)}
		</AuthLayout>
	);
}

/** After the email's sent: the code goes here, or the link in it opens on this device. */
export function CheckEmailPage() {
	const [params] = useSearchParams();
	const email = params.get('email') ?? '';
	// Here from the email's link, opened on another device: the email went a while ago, so it can
	// be sent again straight away
	const fromLink = params.get('from') === 'link';
	const next = useNext();
	const session = useSession();
	const [wait, setWait] = useState(fromLink ? 0 : 60);
	const [error, setError] = useState<string | null>(null);
	// Said once at the moments that matter, not every second of the countdown
	const [announce, setAnnounce] = useState('');
	const [sentAgain, setSentAgain] = useState(false);
	// Set while a code signs in, so the page stays to show "Signed in" before it moves on
	const signingIn = useRef(false);
	const go = useTransitionNavigate();
	// Bumped to put the emulator's code in the field (development only)
	const [filled, setFilled] = useState<{ code: string; n: number } | null>(null);
	const navigate = useNavigate();
	const differentEmail = `/sign-in?${new URLSearchParams({ next })}`;
	const toDifferentEmail = useTransitionLink(differentEmail);
	useEffect(() => {
		if (wait <= 0) return setAnnounce(fromLink ? '' : 'You can send it again now.');
		const t = setTimeout(() => setWait((w) => w - 1), 1000);
		return () => clearTimeout(t);
	}, [wait]);
	if (!looksLikeEmail(email)) return <Navigate to="/sign-in" replace />;
	// Signed in by the link in another tab (a code here moves on by itself, below)
	if (session && !signingIn.current) return <Navigate to={next} replace />;

	return (
		<AuthLayout
			title="Check your email"
			description={
				fromLink ? (
					<>
						That link only signs in on the device you asked from. Here, enter the 6-digit code from the same email to{' '}
						<strong className="font-semibold wrap-anywhere text-dark-blue">{email}</strong>.
					</>
				) : (
					<>
						If <strong className="font-semibold wrap-anywhere text-dark-blue">{email}</strong> is on the organiser list, we’ve sent it a 6-digit code.
						Enter it here, or open the link in the email on this device.
					</>
				)
			}
			foot={<DoorNotes />}
		>
			<OneFieldForm
				key={filled?.n}
				label="Sign-in code"
				action="Sign in"
				busyLabel="Signing in"
				initial={filled?.code}
				check={(code) => (looksLikeCode(code) ? null : 'Enter the 6 digits from the email.')}
				onSubmit={async (code) => {
					signingIn.current = true;
					const error = await signInWithCode(email, digits(code));
					if (error) {
						signingIn.current = false;
						return error;
					}
					// The tick draws in the button, holds a moment, then the dashboard opens
					setTimeout(() => go(next), matchMedia('(prefers-reduced-motion: reduce)').matches ? 400 : 750);
					return null;
				}}
				submitWhen={looksLikeCode}
				shakeOnRefusal
				done="Signed in"
				narrow
				input={{
					inputMode: 'numeric',
					autoComplete: 'one-time-code',
					autoFocus: true,
					placeholder: '123456',
					maxLength: 7,
					spellCheck: false,
					className: 'tabular-nums tracking-widest',
				}}
			/>
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
						setSentAgain(false);
						const failed = await sendSignInLink(email, next);
						setError(failed);
						setSentAgain(!failed);
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
				. Wrong address?{' '}
				<Link to={differentEmail} onClick={toDifferentEmail} className={textLink}>
					Use a different email
				</Link>
				.
			</p>
			<p role="status" className="sr-only">
				{announce}
			</p>
			{/* Seen as well as heard, since the code that worked a minute ago no longer does */}
			<p role="status" className="empty:hidden">
				{sentAgain && (
					<span data-note className="flex items-center gap-2 text-base leading-normal text-dark-blue">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-med-blue">
							<path data-tick d="M3 8.5l3.2 3.2L13 5" pathLength={1} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
						Sent again. Use the code in the newest email.
					</span>
				)}
			</p>
			{error && (
				<p data-note role="alert" className={alert}>
					{error}
				</p>
			)}
			{/* The emulators send no email: fill in its code, or open its link, instead */}
			{usingEmulators && (
				<p className="border-t border-dashed border-light-blue pt-3 text-sm text-med-blue">
					Emulator:{' '}
					<button
						type="button"
						onClick={async () => {
							const code = await emulatorSignInCode(email);
							if (code) setFilled((f) => ({ code, n: (f?.n ?? 0) + 1 }));
						}}
						className="font-semibold underline"
					>
						fill in the code
					</button>{' '}
					·{' '}
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
	const [params] = useSearchParams();
	const sentTo = params.get('email') ?? '';
	const [result, setResult] = useState<LinkResult>();
	const go = useTransitionNavigate();

	useEffect(() => {
		completeSignInLink().then(setResult);
	}, []);

	if (result === undefined) return <Loading />;
	if (result === 'signed-in') return <Navigate to={next} replace />;
	// The email's code works on any device, so ask for that rather than sending a new email.
	// Links from before the address came with them can't, so they get a new email below
	if (result === 'other-device' && looksLikeEmail(sentTo)) return <Navigate to={checkEmailPath(sentTo, next, true)} replace />;
	return (
		<AuthLayout
			title="This link has expired"
			description="Sign-in links work once, for an hour, on the device you asked from. Get a new email, and use its code on any device."
			foot={<DoorNotes />}
		>
			<EmailForm
				initial={lastLinkEmail()}
				action="Email me a new code"
				onSend={async (email) => {
					const error = await sendSignInLink(email, next);
					if (!error) go(checkEmailPath(email, next));
					return error;
				}}
			/>
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
