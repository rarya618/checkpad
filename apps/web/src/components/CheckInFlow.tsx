import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { CheckedIn, PublicEvent } from '@checkpad/shared/api';
import { buttonClass } from '@checkpad/shared/button';
import { checkInStatus } from '@checkpad/shared/events';
import { formatDay, formatTime, formatTimeRange } from '@checkpad/shared/format';
import { ApiFailure, checkIn, checkInWalkIn } from '../lib/api';
import LinkNotFound from './LinkNotFound';
import StatusScreen from './StatusScreen';
import SubmitButton from './SubmitButton';
import TextField from './TextField';

type Step =
	| { name: 'email' }
	| { name: 'walk-in' }
	// Not on the list, and the event doesn't let people add themselves
	| { name: 'not-registered' }
	| { name: 'done'; result: CheckedIn };

interface Props {
	event: PublicEvent;
	/** Static footer ("powered by checkpad") rendered under the form and confirmation. */
	children?: ReactNode;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string) {
	if (!email.trim()) return 'Enter your email address';
	if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a full email address, like jane@example.com';
	return null;
}

export default function CheckInFlow({ event, children }: Props) {
	// The API refuses check-ins once an organiser closes self check-in, or deletes the event,
	// even if it was open when this page loaded.
	const [closed, setClosed] = useState(false);
	const [gone, setGone] = useState(false);
	const [step, setStep] = useState<Step>({ name: 'email' });
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState<string | null>(null);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [requestError, setRequestError] = useState<string | null>(null);
	const emailInput = useRef<HTMLInputElement>(null);

	if (gone) return <LinkNotFound />;

	const checkInState = checkInStatus({ open: event.open && !closed, startsAt: event.startsAt });

	if (checkInState === 'not-open') {
		const startsAt = new Date(event.startsAt);
		return (
			<StatusScreen
				title="Not open yet"
				subtitle={`${event.name} starts at ${formatTime(startsAt, event.timeZone)}, ${formatDay(startsAt, event.timeZone)}.`}
				body="The organisers open check-in at the event. Try this link again once you’re there."
			/>
		);
	}

	if (checkInState === 'closed') {
		return (
			<StatusScreen
				title="Check-in closed"
				subtitle={`Check-in for ${event.name} isn’t open.`}
				body="If you’re still at the event, find one of the organisers."
			/>
		);
	}

	async function submit(action: () => Promise<void>) {
		setSubmitting(true);
		setRequestError(null);
		try {
			await action();
		} catch (error) {
			const code = error instanceof ApiFailure ? error.code : 'network';
			if (code === 'closed') setClosed(true);
			else if (code === 'not-found') setGone(true);
			// Turned off since the page loaded
			else if (code === 'walk-ins-off') setStep({ name: 'not-registered' });
			else if (code === 'rate-limited') setRequestError('Too many check-ins from this network. Wait a few minutes and try again, or find one of the organisers.');
			else if (code === 'invalid') setRequestError('Check your details and try again.');
			else setRequestError('Something went wrong. Check your connection and try again.');
		} finally {
			setSubmitting(false);
		}
	}

	const submitEmail = (e: FormEvent) => {
		e.preventDefault();
		const error = validateEmail(email);
		setEmailError(error);
		if (error) {
			emailInput.current?.focus();
			return;
		}
		return submit(async () => {
			const result = await checkIn(event.slug, email.trim());
			setStep(
				result.status === 'checked-in'
					? { name: 'done', result }
					: result.selfWalkIns
						? { name: 'walk-in' }
						: { name: 'not-registered' },
			);
		});
	};

	const submitWalkIn = (e: FormEvent) => {
		e.preventDefault();
		return submit(async () => {
			const result = await checkInWalkIn(event.slug, { email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() });
			setStep({ name: 'done', result });
		});
	};

	return (
		<main className="mx-auto flex min-h-viewport max-w-[480px] flex-col items-center justify-center gap-7.5 px-4 py-12">
			{step.name === 'done' ? (
				<Confirmation event={event} result={step.result} />
			) : (
				// One card, styled like the confirmation's ticket card so the two read as a set: the
				// event at the top, then the step. Same width too, so nothing shifts between them.
				// Closer on the email step, where the field follows the event name; the other steps
				// keep more room, since they open with a heading of their own
				<div
					className={`flex w-full flex-col ${step.name === 'email' ? 'gap-5' : 'gap-8'} rounded-xl border-2 border-b-6 border-med-blue bg-white px-8 py-10`}
				>
					<header className="flex flex-col gap-1">
						{/* So attendees can see it's tonight's event */}
						<p className="text-base font-semibold text-med-blue">
							{formatDay(new Date(event.startsAt), event.timeZone)} ·{' '}
							{formatTimeRange(new Date(event.startsAt), new Date(event.endsAt), event.timeZone)}
						</p>
						<h1 className="font-display text-3xl leading-tight break-words">{event.name}</h1>
					</header>

					{step.name === 'email' ? (
						<form noValidate onSubmit={submitEmail} className="flex w-full flex-col gap-10">
							<TextField
								ref={emailInput}
								label="Email"
								hint="The one you registered with"
								type="email"
								name="email"
								autoComplete="email"
								placeholder="jane@example.com"
								error={emailError}
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setEmailError(null);
								}}
							/>
							<SubmitButton loading={submitting} className="w-full">
								Check in
							</SubmitButton>
							{requestError && <RequestError message={requestError} />}
						</form>
					) : step.name === 'not-registered' ? (
						<section aria-live="polite" className="flex w-full flex-col gap-7.5">
							<EmailSummary email={email} />
							<div className="flex w-full flex-col gap-2">
								<h2 className="font-display text-2xl leading-tight">You’re not on the list</h2>
								<p className="text-lg text-med-blue">
									Check it’s the email you registered with, or find one of the organisers and they’ll add you.
								</p>
							</div>
							<button type="button" onClick={() => setStep({ name: 'email' })} className={`w-full ${buttonClass('secondary')}`}>
								Try another email
							</button>
						</section>
					) : (
						<form onSubmit={submitWalkIn} className="flex w-full flex-col gap-6">
							{/* Otherwise people not on the list are asked for their name with no reason given */}
							<div className="flex w-full flex-col gap-2">
								<h2 className="font-display text-2xl leading-tight">Add your name</h2>
								<p className="text-lg text-med-blue">You’re not on the list yet, so you’ll check in as a walk-in.</p>
							</div>
							<EmailSummary email={email} />
							<TextField
								label="First name"
								name="firstName"
								autoComplete="given-name"
								placeholder="Jane"
								required
								autoFocus
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
							/>
							<TextField
								label="Last name"
								name="lastName"
								autoComplete="family-name"
								placeholder="Doe"
								required
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
							/>
							<div className="flex w-full items-center gap-4">
								<button
									type="button"
									disabled={submitting}
									onClick={() => {
										setRequestError(null);
										setStep({ name: 'email' });
									}}
									className={buttonClass('secondary')}
								>
									Back
								</button>
								<SubmitButton loading={submitting} className="min-w-0 flex-1">
									Check in
								</SubmitButton>
							</div>
							{requestError && <RequestError message={requestError} />}
						</form>
					)}
				</div>
			)}
			{children}
		</main>
	);
}

function Confirmation({ event, result }: { event: PublicEvent; result: CheckedIn }) {
	const { firstName, ticket, checkedInAt, alreadyCheckedIn } = result;
	const note = 'Show this to one of the organisers';
	return (
		<section
			aria-live="polite"
			className="flex w-full flex-col items-center gap-9 rounded-xl border-2 border-b-6 border-med-blue bg-white px-7 py-10 text-center"
		>
			<h2 className="font-display text-3xl">{event.name}</h2>
			<div className="flex w-full flex-col items-center gap-7.5">
				<div className="flex flex-col items-center gap-1">
					<p className="text-2xl text-med-blue">{alreadyCheckedIn ? 'You’re already checked in' : 'You’re checked in'}</p>
					<h1 className="font-display text-5xl break-words">{firstName}</h1>
				</div>
				{/* Figma "Checked in with ticket (mobile-first)" */}
				{ticket && (
					<div className="flex flex-col items-center gap-1 rounded-xl bg-off-white px-5 py-3">
						<p className="text-base text-med-blue">Ticket</p>
						<p className="font-mono text-xl leading-normal">{ticket}</p>
					</div>
				)}
				<p className="text-lg tracking-tight text-med-blue">
					{alreadyCheckedIn
						? `Checked in at ${formatTime(new Date(checkedInAt), event.timeZone)}. ${note}`
						: note}
				</p>
			</div>
		</section>
	);
}

function EmailSummary({ email }: { email: string }) {
	return (
		<div className="flex w-full flex-col gap-1">
			<p className="text-base text-med-blue">Email</p>
			<p className="text-xl font-semibold break-words">{email}</p>
		</div>
	);
}

function RequestError({ message }: { message: string }) {
	return (
		<p role="alert" className="-mt-4.5 text-center text-base text-error">
			{message}
		</p>
	);
}
