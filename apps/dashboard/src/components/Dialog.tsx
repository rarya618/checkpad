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
	/** "lg": full size, for the projector displays; otherwise the dashboard's 75% scale. */
	size?: 'md' | 'lg';
	className?: string;
	children: ReactNode;
}

export default function Dialog({ title, description, onClose, closeButton, size = 'md', className = '', children }: Props) {
	const lg = size === 'lg';
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
			className={`m-auto max-w-[calc(100vw-48px)] bg-white p-0 text-dark-blue backdrop:bg-dark-blue/45 ${
				lg ? 'rounded-[20px] shadow-[0_12px_40px_rgb(17_45_78/0.18)]' : 'rounded-[15px] shadow-[0_9px_30px_rgb(17_45_78/0.18)]'
			} ${className}`}
		>
			<div className={`flex flex-col ${lg ? 'gap-6 px-10 py-9' : 'gap-[18px] px-[30px] py-[27px]'}`}>
				<div className={`flex items-start ${lg ? 'gap-4' : 'gap-3'}`}>
					<div className={`flex min-w-0 flex-1 flex-col ${lg ? 'gap-2' : 'gap-1.5'}`}>
						<h2 id="dialog-title" className={`font-display leading-[1.2] ${lg ? 'text-[32px]' : 'text-2xl'}`}>
							{title}
						</h2>
						<p id="dialog-description" className={`leading-[1.5] text-med-blue ${lg ? 'text-xl' : 'text-[15px]'}`}>
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
