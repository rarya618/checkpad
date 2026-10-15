import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
}

export default function TextField({ label, ...inputProps }: Props) {
	const id = useId();
	return (
		<div className="flex w-full flex-col gap-2">
			<label htmlFor={id} className="text-lg text-black">
				{label}
			</label>
			<input
				id={id}
				className="w-full rounded-[10px] bg-off-white px-6 py-3 text-xl text-dark-blue placeholder:text-[#bbb] focus:outline-2 focus:outline-med-blue"
				{...inputProps}
			/>
		</div>
	);
}
