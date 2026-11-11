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
			<label htmlFor={id} className="text-base text-black">
				{label}
			</label>
			<input
				id={id}
				aria-invalid={error ? true : undefined}
				aria-describedby={note ? noteId : undefined}
				// Plain text, no box: the label above and the placeholder show where to type, and an
				// error shows as the message underneath
				className="w-full text-2xl font-bold text-dark-blue outline-none placeholder:text-[#bbb]"
				{...inputProps}
			/>
			{note && (
				<p id={noteId} className={`mt-1 text-base ${error ? 'text-error' : 'text-med-blue'}`}>
					{note}
				</p>
			)}
		</div>
	);
}
