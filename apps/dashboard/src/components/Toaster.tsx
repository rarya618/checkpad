import check from '../assets/check.svg';
import { dismissToast, useToast } from '../lib/toast';
import { useIsDesktop } from '../lib/useMediaQuery';

// Figma "Toast", bottom centre of the content column: 75% scale on desktop, full size
// on phones. With an action (Action=Yes) it gets a button such as Undo.
export default function Toaster() {
	const toast = useToast();
	const desktop = useIsDesktop();
	return (
		<div
			aria-live="polite"
			className={`pointer-events-none absolute inset-x-0 flex justify-center px-5 ${desktop ? 'bottom-[27px]' : 'bottom-6'}`}
		>
			{toast && (
				<div
					key={toast.id}
					className={`flex animate-toast-in items-center bg-dark-blue font-semibold text-white drop-shadow-[0_6px_9px_rgb(17_45_78/0.25)] ${
						desktop
							? `gap-[10.5px] rounded-[9px] py-[10.5px] pl-[15px] text-[13.5px] leading-[1.5] ${toast.action ? 'pr-[9px]' : 'pr-[18px]'}`
							: `gap-3.5 rounded-xl py-3.5 pl-5 text-lg leading-[1.5] ${toast.action ? 'pr-3' : 'pr-6'}`
					}`}
				>
					<img src={check} alt="" width={desktop ? 16.5 : 22} height={desktop ? 16.5 : 22} />
					<p>{toast.message}</p>
					{toast.action && (
						<button
							type="button"
							onClick={() => {
								toast.action!.onClick();
								dismissToast();
							}}
							className={`pointer-events-auto font-bold text-light-blue transition-colors hover:bg-white/20 ${
								desktop ? 'rounded-md bg-white/12 px-[10.5px] py-[4.5px]' : 'rounded-lg bg-white/12 px-3.5 py-1.5'
							}`}
						>
							{toast.action.label}
						</button>
					)}
				</div>
			)}
		</div>
	);
}
