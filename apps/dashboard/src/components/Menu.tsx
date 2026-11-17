import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import check from '../assets/check-blue.svg';

// Figma "Menu" (event ⋮ menus) at 75% scale: a bordered popover under its button.
export interface MenuItem {
	label: string;
	/** Optional: the event switcher's items are text only. */
	icon?: string;
	/** A second, quieter line under the label, e.g. an event's date. */
	detail?: string;
	/** The page you're on: marked with a tick and aria-current. */
	current?: boolean;
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
	/** Shown above the items, e.g. who is signed in (Figma "Account menu"). */
	header?: ReactNode;
	/**
	 * "above-left" opens upwards from a button near the bottom-left (the sidebar's account button);
	 * "below-left" opens down from a wide button's left edge (the sidebar's event switcher).
	 */
	placement?: 'below-right' | 'above-left' | 'below-left';
	/** The popover's width, when 225px doesn't suit. */
	menuWidth?: string;
	children: ReactNode;
}

export default function Menu({ label, items, buttonClassName, header, placement = 'below-right', menuWidth = 'w-[225px]', children }: Props) {
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
		'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-left text-sm leading-normal font-semibold text-dark-blue outline-none hover:bg-off-white focus-visible:bg-off-white aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-transparent';

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
					data-placement={placement}
					className={`absolute z-20 flex max-h-[min(480px,70dvh)] ${menuWidth} flex-col gap-1 overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_9px_30px_rgb(17_45_78/0.14)] ${
						placement === 'above-left' ? 'bottom-[calc(100%+6px)] left-0' : placement === 'below-left' ? 'top-[calc(100%+6px)] left-0' : 'top-[calc(100%+6px)] right-0'
					}`}
				>
					{header && (
						<>
							<div role="none">{header}</div>
							<div role="separator" className="h-px bg-light-blue" />
						</>
					)}
					{items.map((item) => {
						const content = (
							<>
								{item.icon && <img src={item.icon} alt="" width={18} height={18} />}
								{item.detail ? (
									<span className="flex min-w-0 flex-1 flex-col">
										<span className="line-clamp-2">{item.label}</span>
										<span className="text-xs font-normal text-med-blue">{item.detail}</span>
									</span>
								) : (
									<span className="min-w-0 flex-1">{item.label}</span>
								)}
								{item.current && <img src={check} alt="" width={16} height={16} className="shrink-0" />}
							</>
						);
						return (
							<div key={item.to ?? item.label} role="none" className="contents">
								{item.separated && <div role="separator" className="h-px bg-light-blue" />}
								{item.to && !item.disabled ? (
									<Link role="menuitem" to={item.to} aria-current={item.current ? 'page' : undefined} onClick={() => setOpen(false)} className={itemClass}>
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
