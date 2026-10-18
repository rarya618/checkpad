import { useEffect, useRef, type ReactNode } from 'react';

// Figma "Leave dialog" / "Delete dialog" at 75% scale, over a dark-blue scrim.
// A native modal <dialog>: it traps focus, and Esc or a click on the scrim calls onClose.
// Focus starts on the element marked data-autofocus, else the first button. Render it only while open.
interface Props {
	title: string;
	description: ReactNode;
	onClose: () => void;
	/** Shows a close (×) button at the top right, as the delete dialog does. */
	closeButton?: ReactNode;
	className?: string;
	children: ReactNode;
}

export default function Dialog({ title, description, onClose, closeButton, className = '', children }: Props) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current!;
		dialog.showModal();
		dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
		return () => dialog.close();
	}, []);

	return (
		<dialog
			ref={ref}
			aria-labelledby="dialog-title"
			aria-describedby="dialog-description"
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
			onClick={(e) => e.target === e.currentTarget && onClose()}
			className={`m-auto max-w-[calc(100vw-48px)] rounded-[15px] bg-white p-0 text-dark-blue shadow-[0_9px_30px_rgb(17_45_78/0.18)] backdrop:bg-dark-blue/45 ${className}`}
		>
			<div className="flex flex-col gap-[18px] px-[30px] py-[27px]">
				<div className="flex items-start gap-3">
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<h2 id="dialog-title" className="font-display text-2xl leading-[1.2]">
							{title}
						</h2>
						<p id="dialog-description" className="text-[15px] leading-[1.5] text-med-blue">
							{description}
						</p>
					</div>
					{closeButton}
				</div>
				{children}
			</div>
		</dialog>
	);
}
