import { useId, useState, type FormEvent } from 'react';
import { EMAIL_PATTERN, joinWaitlist, MAX_EMAIL_LENGTH, normaliseEmail } from '../../lib/waitlist';
import SubmitButton from '../SubmitButton';

declare global {
	interface Window {
		/** Google Analytics, in production builds only (Analytics.astro). */
		gtag?: (...args: unknown[]) => void;
	}
}

function validateEmail(email: string) {
	if (!email.trim()) return 'Enter your email address';
	if (!EMAIL_PATTERN.test(email.trim()) || email.trim().length > MAX_EMAIL_LENGTH) {
		return 'Enter a full email address, like jane@example.com';
	}
	return null;
}

// On the marketing page twice: in the hero, on the off-white ground ("light"), and on the dark
// blue call to action at the end ("dark"). Not in Figma yet.
export default function WaitlistForm({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
	const light = tone === 'light';
	const id = useId();
	const errorId = `${id}-error`;
	const [email, setEmail] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [joined, setJoined] = useState<string | null>(null);

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		const invalid = validateEmail(email);
		setError(invalid);
		if (invalid) return;
		setSubmitting(true);
		try {
			await joinWaitlist(email);
			window.gtag?.('event', 'join_waitlist');
			setJoined(normaliseEmail(email));
		} catch {
			setError('Something went wrong. Check your connection and try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (joined) {
		return (
			<p role="status" className={`text-base xl:text-xl ${light ? 'text-dark-blue' : 'text-off-white'}`}>
				You’re on the list. We’ll email <span className="font-semibold">{joined}</span> when Checkpad opens.
			</p>
		);
	}

	return (
		<form noValidate onSubmit={onSubmit} className="flex w-full max-w-[520px] flex-col gap-2 text-left">
			<label htmlFor={id} className="sr-only">
				Email address
			</label>
			<div className="flex flex-col gap-3 sm:flex-row">
				<input
					id={id}
					type="email"
					autoComplete="email"
					placeholder="you@example.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : undefined}
					className={`min-w-0 flex-1 rounded-xl px-5 py-2.5 text-lg text-dark-blue placeholder:text-dark-blue/70 focus:outline-2 focus:outline-offset-2 ${
						light ? 'bg-white inset-ring inset-ring-dark-blue/20 focus:outline-med-blue' : 'bg-off-white focus:outline-light-blue'
					} ${error ? 'inset-ring-2 inset-ring-error' : ''}`}
				/>
				<SubmitButton loading={submitting} loadingLabel="Joining the waitlist" variant={light ? 'primary' : 'secondary'}>
					Join the waitlist
				</SubmitButton>
			</div>
			{error && (
				<p id={errorId} className={`text-base ${light ? 'text-error' : 'text-off-white'}`}>
					{error}
				</p>
			)}
		</form>
	);
}
