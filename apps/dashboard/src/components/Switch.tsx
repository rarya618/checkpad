// Figma "Switch" (On/Off) at 75% scale: a 42×24 track with an 18px knob.
interface Props {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}

export default function Switch({ checked, onChange, label }: Props) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onChange(!checked)}
			className={`relative h-6 w-[42px] shrink-0 rounded-full transition-colors ${checked ? 'bg-dark-blue' : 'bg-light-blue'}`}
		>
			<span
				aria-hidden="true"
				className={`absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : ''}`}
			/>
		</button>
	);
}
