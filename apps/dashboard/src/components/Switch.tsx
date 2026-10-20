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

/** A switch with its label and a note underneath, on an off-white row (Event settings, New event). */
export function SwitchRow({ label, note, ...switchProps }: Props & { note: string }) {
	return (
		<div className="flex items-center gap-3 rounded-[7.5px] bg-off-white px-[15px] py-[10.5px]">
			<div className="flex min-w-0 flex-1 flex-col gap-[1.5px] leading-[1.5]">
				<p className="text-[15px] font-bold">{label}</p>
				<p className="text-xs text-med-blue">{note}</p>
			</div>
			<Switch label={label} {...switchProps} />
		</div>
	);
}
