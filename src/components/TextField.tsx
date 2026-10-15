import { useId, type ComponentProps } from 'react';

interface Props extends ComponentProps<'input'> {
	label: string;
	error?: string | null;
}

export default function TextField({ label, error, ...inputProps }: Props) {
	const id = useId();
	const errorId = `${id}-error`;
	return (
		<div className="flex w-full flex-col gap-2">
			<label htmlFor={id} className="text-lg text-black">
				{label}
			</label>
			<input
				id={id}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? errorId : undefined}
				className={`w-full rounded-[10px] bg-off-white px-6 py-3 text-xl text-dark-blue placeholder:text-[#bbb] focus:outline-2 focus:outline-med-blue ${error ? 'inset-ring-2 inset-ring-error focus:outline-error' : ''}`}
				{...inputProps}
			/>
			{error && (
				<p id={errorId} className="text-base text-error">
					{error}
				</p>
			)}
		</div>
	);
}
