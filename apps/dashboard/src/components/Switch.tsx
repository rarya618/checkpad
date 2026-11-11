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
		<div className="flex items-center gap-3 rounded-lg bg-off-white px-4 py-2.5">
			<div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-normal">
				<p className="text-sm font-bold">{label}</p>
				<p className="text-xs text-med-blue">{note}</p>
			</div>
			<Switch label={label} {...switchProps} />
		</div>
	);
}
