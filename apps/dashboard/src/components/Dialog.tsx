import { useEffect, useRef, useState, type ReactNode } from 'react';

// Figma "Leave dialog" / "Delete dialog" at 75% scale, over a dark-blue scrim. Every dialog uses this size, the prize draw's included.
// A native modal <dialog>: it traps focus, and Esc or a click on the scrim calls onClose.
// Focus starts on the element marked data-autofocus, else the first button. Render it only while open.
interface Props {
	title: string;
	description: ReactNode;
	onClose: () => void;
	/** Shows a close (×) button at the top right, as the delete dialog does. */
	closeButton?: ReactNode;
	/**
	 * The dialog's buttons, kept in view: with a footer the dialog never grows past the window,
	 * and what's between the heading and the footer scrolls, with a hairline over the footer while it does.
	 */
	footer?: ReactNode;
	className?: string;
	children: ReactNode;
}

export default function Dialog({ title, description, onClose, closeButton, footer, className = '', children }: Props) {
	const ref = useRef<HTMLDialogElement>(null);
	const body = useRef<HTMLDivElement>(null);
	const [scrolls, setScrolls] = useState(false);

	useEffect(() => {
		const dialog = ref.current!;
		dialog.showModal();
		dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
		return () => dialog.close();
	}, []);

	useEffect(() => {
		const el = body.current;
		if (!el || !footer) return;
		const measure = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		for (const child of el.children) observer.observe(child);
		measure();
		return () => observer.disconnect();
	});

	const header = (
		<div className="flex items-start gap-3">
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<h2 id="dialog-title" className="font-display text-2xl leading-tight">
					{title}
				</h2>
				<p id="dialog-description" className="text-sm leading-normal text-med-blue">
					{description}
				</p>
			</div>
			{closeButton}
		</div>
	);

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
			className={`m-auto max-w-[calc(100vw-48px)] bg-white p-0 text-dark-blue rounded-2xl backdrop:bg-dark-blue/45 shadow-[0_9px_30px_rgb(17_45_78/0.18)] ${footer ? 'max-h-[calc(100dvh-48px)] flex-col overflow-hidden open:flex' : ''} ${className}`}
		>
			{footer ? (
				<>
					<div className="px-6 pt-7 pb-5 sm:px-8">{header}</div>
					<div ref={body} className="relative flex min-h-0 flex-col gap-5 overflow-y-auto px-6 pb-1 sm:px-8">
						{children}
					</div>
					<div className={`border-t px-6 pt-5 pb-7 transition-colors sm:px-8 ${scrolls ? 'border-line' : 'border-transparent'}`}>{footer}</div>
				</>
			) : (
				<div className="flex flex-col gap-5 px-8 py-7">
					{header}
					{children}
				</div>
			)}
		</dialog>
	);
}
