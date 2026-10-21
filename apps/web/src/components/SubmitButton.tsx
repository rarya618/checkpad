import { buttonClass, type ButtonVariant } from '@checkpad/shared/button';

interface Props {
	loading: boolean;
	/** Read to screen readers while the spinner shows. */
	loadingLabel?: string;
	variant?: ButtonVariant;
	className?: string;
	children: string;
}

// Submit button that swaps its label for a spinner while loading. The label stays in
// the layout (invisible) so the button doesn't change size.
export default function SubmitButton({ loading, loadingLabel = 'Checking in', variant = 'primary', className = '', children }: Props) {
	return (
		<button type="submit" disabled={loading} aria-busy={loading} className={`relative ${buttonClass(variant)} ${className}`}>
			<span className={loading ? 'invisible' : undefined}>{children}</span>
			{loading && (
				<span className="absolute inset-0 flex items-center justify-center">
					<Spinner />
					<span className="sr-only">{loadingLabel}</span>
				</span>
			)}
		</button>
	);
}

export function Spinner() {
	// 9px radius, 2px ring; the arc covers 3/8 of the circle like the Figma spinner.
	const circumference = 2 * Math.PI * 9;
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="animate-spin">
			<circle cx="10" cy="10" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
			<circle
				cx="10"
				cy="10"
				r="9"
				stroke="currentColor"
				strokeWidth="2"
				strokeDasharray={`${circumference * 0.375} ${circumference}`}
				transform="rotate(-90 10 10)"
			/>
		</svg>
	);
}
