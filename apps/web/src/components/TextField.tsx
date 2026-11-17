import { useId, type ComponentProps } from 'react';

interface Props extends ComponentProps<'input'> {
	label: string;
	/** A line under the field saying what to enter. An error takes its place. */
	hint?: string;
	error?: string | null;
}

export default function TextField({ label, hint, error, ...inputProps }: Props) {
	const id = useId();
	const noteId = `${id}-note`;
	const note = error || hint;
	return (
		<div className="flex w-full flex-col gap-2">
			<label htmlFor={id} className="text-base text-dark-blue">
				{label}
			</label>
			<input
				id={id}
				aria-invalid={error ? true : undefined}
				aria-describedby={note ? noteId : undefined}
				// Plain text, no box: the label above and the placeholder show where to type, and an
				// error shows as the message underneath. Focus is DESIGN.md's 2px med-blue ring, held
				// clear of the text; the placeholder is navy at 55%, 3.5:1 on white.
				className="w-full rounded-md text-2xl font-bold text-dark-blue outline-none placeholder:text-dark-blue/55 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-med-blue focus-visible:outline-solid"
				{...inputProps}
			/>
			{note && (
				// Keyed so a new error fades in rather than replacing the hint in place. An error is an
				// alert, so a screen reader says it as it appears while focus stays in the field
				<p
					key={error ? 'error' : 'hint'}
					id={noteId}
					role={error ? 'alert' : undefined}
					data-message={error ? '' : undefined}
					className={`mt-1 text-base ${error ? 'text-error' : 'text-med-blue'}`}
				>
					{note}
				</p>
			)}
		</div>
	);
}
