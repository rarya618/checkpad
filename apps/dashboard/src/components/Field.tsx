import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes } from 'react';
import chevronDown from '../assets/chevron-down.svg';

// Figma "Text field": label, filled box, optional hint. "md" is the desktop dashboard's
// 75% scale; "lg" is full size for the phone screens. Focus draws Figma's 2px med-blue
// border as an inset outline, so nothing shifts.
const sizes = {
	md: {
		gap: 'gap-1.5',
		label: 'text-[13.5px]',
		box: 'rounded-[7.5px] px-[18px] py-3 text-[15px] focus-within:outline-[1.5px] focus-within:-outline-offset-[1.5px]',
		note: 'text-xs',
		chevron: { size: 15, right: 'right-[18px]', pad: 'pr-[42px]' },
	},
	lg: {
		gap: 'gap-2',
		label: 'text-lg',
		box: 'rounded-[10px] px-6 py-4 text-xl focus-within:outline-2 focus-within:-outline-offset-2',
		note: 'text-base',
		chevron: { size: 20, right: 'right-6', pad: 'pr-14' },
	},
};
type Size = keyof typeof sizes;

const boxBase = 'w-full bg-off-white leading-[1.5] text-black outline-none focus-within:outline-med-blue';
const box = (size: Size) => `${boxBase} ${sizes[size].box}`;

interface FieldProps {
	label: string;
	hint?: ReactNode;
	/** Shown instead of the hint, in the error colour. */
	error?: string | null;
	size?: Size;
	className?: string;
	children: (control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}

export function Field({ label, hint, error, size = 'md', className = '', children }: FieldProps) {
	const id = useId();
	const note = error ?? hint;
	return (
		<div className={`flex flex-col ${sizes[size].gap} ${className}`}>
			<label htmlFor={id} className={`${sizes[size].label} leading-[1.5] text-black`}>
				{label}
			</label>
			{children({ id, 'aria-describedby': note ? `${id}-note` : undefined, 'aria-invalid': error ? true : undefined })}
			{note && (
				<p id={`${id}-note`} className={`${sizes[size].note} leading-[1.5] ${error ? 'text-error' : 'text-med-blue'}`}>
					{note}
				</p>
			)}
		</div>
	);
}

type Base = Omit<FieldProps, 'children'>;

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { ref?: Ref<HTMLInputElement> };

export function TextField({ label, hint, error, size = 'md', className, ...input }: Base & InputProps) {
	return (
		<Field label={label} hint={hint} error={error} size={size} className={className}>
			{(control) => <input type="text" {...control} {...input} className={`${box(size)} placeholder:text-[#bbbbbb]`} />}
		</Field>
	);
}

export function SelectField({
	label,
	hint,
	error,
	size = 'md',
	className,
	children,
	...select
}: Base & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { children: ReactNode }) {
	const { chevron } = sizes[size];
	return (
		<Field label={label} hint={hint} error={error} size={size} className={className}>
			{(control) => (
				<div className="relative">
					<select {...control} {...select} className={`${box(size)} appearance-none ${chevron.pad}`}>
						{children}
					</select>
					<img
						src={chevronDown}
						alt=""
						width={chevron.size}
						height={chevron.size}
						className={`pointer-events-none absolute top-1/2 ${chevron.right} -translate-y-1/2`}
					/>
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
	size = 'md',
	className,
	host,
	...input
}: Base & InputProps & { host: string }) {
	return (
		<Field label={label} hint={hint} error={error} size={size} className={className}>
			{(control) => (
				<div className={`${box(size)} flex items-center`}>
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
