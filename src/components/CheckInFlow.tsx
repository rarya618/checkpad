import { useState, type FormEvent } from 'react';
import divider from '../assets/divider.svg';
import { checkIn, checkInWalkIn, type Attendee } from '../lib/checkin';
import type { CheckpadEvent } from '../lib/events';
import { buttonClass } from './button';
import TextField from './TextField';

type Step = { name: 'email' } | { name: 'walk-in' } | { name: 'done'; attendee: Attendee };

interface Props {
	event: CheckpadEvent;
}

export default function CheckInFlow({ event }: Props) {
	const [step, setStep] = useState<Step>({ name: 'email' });
	const [email, setEmail] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit(e: FormEvent, action: () => Promise<void>) {
		e.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await action();
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setSubmitting(false);
		}
	}

	const submitEmail = (e: FormEvent) =>
		submit(e, async () => {
			const result = await checkIn(event.slug, email);
			setStep(result.status === 'checked-in' ? { name: 'done', attendee: result.attendee } : { name: 'walk-in' });
		});

	const submitWalkIn = (e: FormEvent) =>
		submit(e, async () => {
			const attendee = await checkInWalkIn(event.slug, { email, firstName, lastName });
			setStep({ name: 'done', attendee });
		});

	if (step.name === 'done') {
		// The confirmation screen is inset further than the forms (36px vs 24px page padding).
		return (
			<section
				aria-live="polite"
				className="flex w-[calc(100%-24px)] flex-col items-center gap-9 rounded-[10px] border-2 border-b-6 border-med-blue bg-white px-7 py-10 text-center"
			>
				<div className="flex w-full flex-col items-center gap-7.5">
					<div className="flex flex-col items-center gap-1">
						<p className="text-2xl text-med-blue">You’re checked in</p>
						<h1 className="font-display text-5xl break-words">{step.attendee.firstName}</h1>
					</div>
					<p className="text-lg tracking-[-0.45px] text-med-blue">Show this to one of the organisers</p>
				</div>
				<img src={divider.src} alt="" width={388} height={1} className="block h-px w-full" />
				<div className="flex flex-col items-center gap-2">
					<h2 className="font-display text-3xl">{event.name}</h2>
					<p className="text-lg text-med-blue">{event.description}</p>
				</div>
			</section>
		);
	}

	return (
		<>
			<header className="flex flex-col items-center gap-2 text-center">
				<h1 className="font-display text-[40px] leading-tight break-words">{event.name}</h1>
				<p className="text-2xl text-med-blue">{event.description}</p>
			</header>

			{step.name === 'email' ? (
				<form onSubmit={submitEmail} className="flex w-full flex-col gap-9 rounded-[10px] bg-white px-5 py-7.5">
					<TextField
						label="Email"
						type="email"
						name="email"
						autoComplete="email"
						placeholder="jane@example.com"
						required
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<button type="submit" disabled={submitting} className={`w-full ${buttonClass('primary')}`}>
						{submitting ? 'Checking in…' : 'Check in'}
					</button>
					{error && <ErrorMessage message={error} />}
				</form>
			) : (
				<form onSubmit={submitWalkIn} className="flex w-full flex-col gap-9 rounded-[10px] bg-white px-5 py-7.5">
					<div className="flex w-full flex-col gap-2">
						<p className="text-lg text-black">Email</p>
						<p className="text-xl font-semibold break-all">{email}</p>
					</div>
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
								setError(null);
								setStep({ name: 'email' });
							}}
							className={buttonClass('secondary')}
						>
							Back
						</button>
						<button type="submit" disabled={submitting} className={`min-w-0 flex-1 ${buttonClass('primary')}`}>
							{submitting ? 'Checking in…' : 'Check in'}
						</button>
					</div>
					{error && <ErrorMessage message={error} />}
				</form>
			)}
		</>
	);
}

// Not in the Figma file; kept deliberately plain until there's a designed error state.
function ErrorMessage({ message }: { message: string }) {
	return (
		<p role="alert" className="-mt-4.5 text-center text-base text-med-blue">
			{message}
		</p>
	);
}
