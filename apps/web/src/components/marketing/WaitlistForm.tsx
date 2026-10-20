import { useId, useState, type FormEvent } from 'react';
import { EMAIL_PATTERN, joinWaitlist, MAX_EMAIL_LENGTH, normaliseEmail } from '../../lib/waitlist';
import SubmitButton from '../SubmitButton';

// Sits on the dark blue call-to-action card on the marketing page. Not in Figma yet.
function validateEmail(email: string) {
	if (!email.trim()) return 'Enter your email address';
	if (!EMAIL_PATTERN.test(email.trim()) || email.trim().length > MAX_EMAIL_LENGTH) {
		return 'Enter a full email address, like jane@example.com';
	}
	return null;
}

export default function WaitlistForm() {
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
			setJoined(normaliseEmail(email));
		} catch {
			setError('Something went wrong. Check your connection and try again.');
		} finally {
			setSubmitting(false);
		}
	}

	if (joined) {
		return (
			<p role="status" className="text-[17px] leading-[26px] text-off-white xl:text-xl xl:leading-[30px]">
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
					className={`min-w-0 flex-1 rounded-[10px] bg-off-white px-5 py-2.5 text-lg text-dark-blue placeholder:text-dark-blue/50 focus:outline-2 focus:outline-offset-2 focus:outline-light-blue ${error ? 'inset-ring-2 inset-ring-error' : ''}`}
				/>
				<SubmitButton loading={submitting} loadingLabel="Joining the waitlist" variant="secondary">
					Join the waitlist
				</SubmitButton>
			</div>
			{error && (
				<p id={errorId} className="text-base text-off-white">
					{error}
				</p>
			)}
		</form>
	);
}
