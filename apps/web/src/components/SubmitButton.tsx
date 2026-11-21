import { buttonClass, type ButtonSize, type ButtonVariant } from '@checkpad/shared/button';
import { Spinner } from '@checkpad/shared/spinner';

interface Props {
	loading: boolean;
	/** Read to screen readers while the spinner shows. */
	loadingLabel?: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	className?: string;
	/** Focus it as it appears: when check-in opens on someone waiting (CheckInFlow). */
	autoFocus?: boolean;
	children: string;
}

// Submit button that swaps its label for a spinner while loading. The label stays in
// the layout (invisible) so the button doesn't change size.
export default function SubmitButton({ loading, loadingLabel = 'Checking in', variant = 'primary', size = 'md', className = '', autoFocus, children }: Props) {
	return (
		<button type="submit" autoFocus={autoFocus} disabled={loading} aria-busy={loading} className={`relative ${buttonClass(variant, size)} ${className}`}>
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
