import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from 'react';
import Select from './Select';

// Figma "Text field": label, filled box, optional hint. "md" is the desktop dashboard's
// 75% scale; "lg" is full size for the phone screens. Focus draws Figma's 2px med-blue
// border as an inset outline, so nothing shifts.
const sizes = {
	md: {
		gap: 'gap-1.5',
		label: 'text-sm',
		box: 'rounded-lg px-5 py-3 text-base focus-within:outline-[1.5px] focus-within:-outline-offset-[1.5px]',
		note: 'text-sm',
		chevron: { size: 15, right: 'right-[18px]', pad: 'pr-11' },
	},
	lg: {
		gap: 'gap-2',
		label: 'text-lg',
		box: 'rounded-xl px-6 py-4 text-xl focus-within:outline-2 focus-within:-outline-offset-2',
		note: 'text-base',
		chevron: { size: 20, right: 'right-6', pad: 'pr-14' },
	},
};
type Size = keyof typeof sizes;

// Off-white on white cards; white with a faint navy ring straight on the off-white page
// (the sign-in layout marks that with data-on-ground), where off-white would disappear
const boxBase =
	'w-full bg-off-white leading-normal text-dark-blue outline-none focus-within:outline-med-blue in-data-on-ground:bg-white in-data-on-ground:shadow-[inset_0_0_0_1px_rgb(17_45_78/0.2)]';
/** The filled box a field's control is drawn in, for fields built from Field directly. */
export const box = (size: Size) => `${boxBase} ${sizes[size].box}`;

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
			<label htmlFor={id} className={`${sizes[size].label} leading-normal text-dark-blue`}>
				{label}
			</label>
			{children({ id, 'aria-describedby': note ? `${id}-note` : undefined, 'aria-invalid': error ? true : undefined })}
			{note && (
				<p id={`${id}-note`} className={`${sizes[size].note} leading-normal ${error ? 'text-error' : 'text-med-blue'}`}>
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

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };

/** A text field for a few lines, e.g. an event's description. A fixed four rows tall; longer text scrolls. */
export function TextAreaField({ label, hint, error, size = 'md', className, rows = 4, ...textarea }: Base & TextAreaProps) {
	return (
		<Field label={label} hint={hint} error={error} size={size} className={className}>
			{(control) => <textarea rows={rows} {...control} {...textarea} className={`${box(size)} block resize-none placeholder:text-[#bbbbbb]`} />}
		</Field>
	);
}

/**
 * A dropdown field: the dashboard's own list (Select), written with <option> and <optgroup>
 * children like a <select>. `onChange` gets `{ target: { value } }`, as a select's change event would.
 */
export function SelectField({
	label,
	hint,
	error,
	size = 'md',
	className,
	children,
	value,
	onChange,
	disabled,
	required,
}: Base & { value: string; onChange: (e: { target: { value: string } }) => void; disabled?: boolean; required?: boolean; children: ReactNode }) {
	const { chevron } = sizes[size];
	return (
		<Field label={label} hint={hint} error={error} size={size} className={className}>
			{(control) => (
				<Select
					{...control}
					value={value}
					onChange={(next) => onChange({ target: { value: next } })}
					disabled={disabled}
					required={required}
					buttonClassName={`${box(size)} ${chevron.pad} disabled:cursor-not-allowed`}
					chevron={chevron}
				>
					{children}
				</Select>
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
