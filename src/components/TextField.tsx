import { useId, type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	label: string;
}

export default function TextField({ label, ...inputProps }: Props) {
	const id = useId();
	return (
		<div className="flex w-full flex-col gap-2.5">
			<label htmlFor={id} className="text-2xl text-black">
				{label}
			</label>
			<input
				id={id}
				className="w-full rounded-[12px] bg-off-white px-8 py-4 text-[28px] text-dark-blue placeholder:text-[#bbb] focus:outline-2 focus:outline-med-blue"
				{...inputProps}
			/>
		</div>
	);
}
