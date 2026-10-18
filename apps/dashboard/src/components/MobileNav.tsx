import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import close from '../assets/close.svg';
import menuIcon from '../assets/menu.svg';
import { currentUser } from '../lib/mock';
import type { SidebarItem } from './Sidebar';

export interface MobileNavConfig {
	/** Heading at the top of the menu, e.g. the event name. */
	title: string;
	items: SidebarItem[];
	/** Below the divider: links out of this section, or actions not built yet. */
	extras: { label: string; to?: string; disabled?: boolean }[];
}

// Phones get Figma "Staff check in (mobile)"'s top bar instead of the sidebar, and its
// menu ("– menu") slides in from the right. Full size, not the desktop's 75%.
export default function MobileNav({ title, items, extras }: MobileNavConfig) {
	const [open, setOpen] = useState(false);
	const dialog = useRef<HTMLDialogElement>(null);
	const { pathname } = useLocation();

	useEffect(() => {
		if (open) dialog.current?.showModal();
		else dialog.current?.close();
	}, [open]);
	// Close after following a link
	useEffect(() => setOpen(false), [pathname]);

	const item = 'block rounded-lg px-7 py-3 text-2xl leading-[1.5]';
	const idle = 'tracking-[-0.6px] hover:bg-white/50';

	return (
		<>
			<header className="flex items-center justify-between px-5 pt-5 pb-6">
				<img src={logo} alt="checkpad" width={134} height={32} />
				<button type="button" aria-label="Open menu" aria-haspopup="dialog" onClick={() => setOpen(true)} className="-m-2 rounded-lg p-2 hover:bg-light-blue/60">
					<img src={menuIcon} alt="" width={28} height={28} />
				</button>
			</header>
			<dialog
				ref={dialog}
				data-drawer
				aria-label="Menu"
				onClose={() => setOpen(false)}
				onClick={(e) => e.target === e.currentTarget && setOpen(false)}
				className="m-0 ml-auto h-dvh max-h-none w-[320px] max-w-[85vw] bg-light-blue p-0 text-dark-blue backdrop:bg-dark-blue/45"
			>
				<div className="flex h-full flex-col gap-2 px-4 py-6">
					<div className="flex items-center pb-3 pl-3">
						<p className="min-w-0 flex-1 truncate font-display text-[22px] leading-[1.5]">{title}</p>
						<button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="-m-1 rounded p-1 hover:bg-white/50">
							<img src={close} alt="" width={28} height={28} />
						</button>
					</div>
					<nav aria-label="Main">
						<ul className="flex flex-col gap-2">
							{items.map((i) => (
								<li key={i.to}>
									<NavLink
										to={i.to}
										end={i.end}
										className={({ isActive }) => `${item} ${isActive ? 'bg-dark-blue font-display text-off-white' : idle}`}
									>
										{i.label}
									</NavLink>
								</li>
							))}
						</ul>
					</nav>
					<div className="flex-1" />
					<div className="h-px bg-med-blue/40" />
					<ul className="flex flex-col gap-2">
						{[...extras, { label: 'Sign out', disabled: true }].map((x) => (
							<li key={x.label}>
								{x.to && !x.disabled ? (
									<NavLink to={x.to} end className={`${item} ${idle}`}>
										{x.label}
									</NavLink>
								) : (
									// Not built yet: the prize draw and sign-in come later
									<button type="button" disabled className={`${item} w-full text-left tracking-[-0.6px] disabled:opacity-45`} title="Not available yet">
										{x.label}
									</button>
								)}
							</li>
						))}
					</ul>
					<div className="flex flex-col gap-0.5 pt-3 pl-3 leading-[1.5]">
						<p className="font-display text-xl">{currentUser.name}</p>
						<p className="text-base text-med-blue">{currentUser.role}</p>
					</div>
				</div>
			</dialog>
		</>
	);
}
