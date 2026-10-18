import check from '../assets/check.svg';
import { useToast } from '../lib/toast';

// Figma "Toast" (Action=No) at 75% scale, bottom centre of the content column.
export default function Toaster() {
	const toast = useToast();
	return (
		<div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[27px] flex justify-center">
			{toast && (
				<p
					key={toast.id}
					className="flex animate-toast-in items-center gap-[10.5px] rounded-[9px] bg-dark-blue py-[10.5px] pr-[18px] pl-[15px] text-[13.5px] leading-[1.5] font-semibold text-white drop-shadow-[0_6px_9px_rgb(17_45_78/0.25)]"
				>
					<img src={check} alt="" width={16.5} height={16.5} />
					{toast.message}
				</p>
			)}
		</div>
	);
}
