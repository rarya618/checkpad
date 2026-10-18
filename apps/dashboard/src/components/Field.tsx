import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import chevronDown from '../assets/chevron-down.svg';

// Figma "Text field" at the dashboard's 75% scale: label, filled box, optional hint.
// Focus draws Figma's 2px med-blue border as an inset outline, so nothing shifts.
const box =
	'w-full rounded-[7.5px] bg-off-white px-[18px] py-3 text-[15px] leading-[1.5] text-black outline-none focus-within:outline-[1.5px] focus-within:-outline-offset-[1.5px] focus-within:outline-med-blue';

interface FieldProps {
	label: string;
	hint?: ReactNode;
	/** Shown instead of the hint, in the error colour. */
	error?: string | null;
	className?: string;
	children: (control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}

export function Field({ label, hint, error, className = '', children }: FieldProps) {
	const id = useId();
	const note = error ?? hint;
	return (
		<div className={`flex flex-col gap-1.5 ${className}`}>
			<label htmlFor={id} className="text-[13.5px] leading-[1.5] text-black">
				{label}
			</label>
			{children({ id, 'aria-describedby': note ? `${id}-note` : undefined, 'aria-invalid': error ? true : undefined })}
			{note && (
				<p id={`${id}-note`} className={`text-xs leading-[1.5] ${error ? 'text-error' : 'text-med-blue'}`}>
					{note}
				</p>
			)}
		</div>
	);
}

type Base = Omit<FieldProps, 'children'>;

export function TextField({ label, hint, error, className, ...input }: Base & InputHTMLAttributes<HTMLInputElement>) {
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			{(control) => <input type="text" {...control} {...input} className={`${box} placeholder:text-[#bbbbbb]`} />}
		</Field>
	);
}

export function SelectField({
	label,
	hint,
	error,
	className,
	children,
	...select
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			{(control) => (
				<div className="relative">
					<select {...control} {...select} className={`${box} appearance-none pr-[42px]`}>
						{children}
					</select>
					<img src={chevronDown} alt="" width={15} height={15} className="pointer-events-none absolute top-1/2 right-[18px] -translate-y-1/2" />
				</div>
			)}
		</Field>
	);
}

/** The check-in link: a fixed "checkpad.app/" before an editable slug. */
export function LinkField({
	label,
	hint,
	error,
	className,
	host,
	...input
}: Base & InputHTMLAttributes<HTMLInputElement> & { host: string }) {
	return (
		<Field label={label} hint={hint} error={error} className={className}>
			{(control) => (
				<div className={`${box} flex items-center`}>
					<span aria-hidden="true">{host}/</span>
					<input
						type="text"
						spellCheck={false}
						autoCapitalize="off"
						{...control}
						{...input}
						className="min-w-0 flex-1 bg-transparent outline-none read-only:cursor-default"
					/>
				</div>
			)}
		</Field>
	);
}
