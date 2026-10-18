import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

// Figma "Menu" (event ⋮ menus) at 75% scale: a bordered popover under its button.
export interface MenuItem {
	label: string;
	icon: string;
	/** A link, or an action. */
	to?: string;
	onSelect?: () => void;
	/** Shown but not usable yet: the feature behind it isn't built. */
	disabled?: boolean;
	/** Draws a divider above the item. */
	separated?: boolean;
}

interface Props {
	label: string;
	items: MenuItem[];
	buttonClassName: string;
	children: ReactNode;
}

export default function Menu({ label, items, buttonClassName, children }: Props) {
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const button = useRef<HTMLButtonElement>(null);
	const id = useId();

	const enabled = () => [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];

	useEffect(() => {
		if (!open) return;
		enabled()[0]?.focus();
		const onPointerDown = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open]);

	function close() {
		setOpen(false);
		button.current?.focus();
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
		} else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			const list = enabled();
			const i = list.indexOf(document.activeElement as HTMLElement);
			list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus();
		} else if (e.key === 'Tab') {
			setOpen(false);
		}
	}

	const itemClass =
		'flex w-full items-center gap-[10.5px] rounded-md px-[10.5px] py-[9px] text-left text-[15px] leading-[1.5] font-semibold text-dark-blue outline-none hover:bg-off-white focus-visible:bg-off-white aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent';

	return (
		<div ref={root} className="relative" onKeyDown={onKeyDown}>
			<button
				ref={button}
				type="button"
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? id : undefined}
				onClick={() => setOpen((o) => !o)}
				className={buttonClassName}
			>
				{children}
			</button>
			{open && (
				<div
					id={id}
					role="menu"
					aria-label={label}
					className="absolute top-[calc(100%+6px)] right-0 z-20 flex w-[225px] flex-col gap-[3px] rounded-[10.5px] border border-med-blue bg-white p-1.5 shadow-[0_9px_30px_rgb(17_45_78/0.14)]"
				>
					{items.map((item) => {
						const content = (
							<>
								<img src={item.icon} alt="" width={18} height={18} />
								{item.label}
							</>
						);
						return (
							<div key={item.label} role="none" className="contents">
								{item.separated && <div role="separator" className="h-px bg-light-blue" />}
								{item.to && !item.disabled ? (
									<Link role="menuitem" to={item.to} onClick={() => setOpen(false)} className={itemClass}>
										{content}
									</Link>
								) : (
									<button
										type="button"
										role="menuitem"
										aria-disabled={item.disabled || undefined}
										title={item.disabled ? 'Not available yet' : undefined}
										onClick={() => {
											if (item.disabled) return;
											setOpen(false);
											item.onSelect?.();
										}}
										className={itemClass}
									>
										{content}
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
