import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import close from '../assets/close.svg';
import menuIcon from '../assets/menu.svg';
import { signOut, useSession } from '../lib/auth';
import { roleLabel, useCurrentOrganiser } from '../lib/organisers';
import type { SidebarItem } from './Sidebar';

export interface MobileNavConfig {
	/** Heading at the top of the menu, e.g. the event name. */
	title: string;
	items: SidebarItem[];
	/**
	 * Below the divider: links out of this section, or actions not built yet. `href` opens
	 * in a new tab: a full-screen display for the venue's projector.
	 */
	extras: { label: string; to?: string; href?: string; disabled?: boolean; onSelect?: () => void }[];
}

// Phones get Figma "Staff check in (mobile)"'s top bar instead of the sidebar, and its
// menu ("– menu") slides up from the bottom as a sheet.
export default function MobileNav({ title, items, extras }: MobileNavConfig) {
	const [open, setOpen] = useState(false);
	const session = useSession();
	const me = useCurrentOrganiser();
	const dialog = useRef<HTMLDialogElement>(null);
	const { pathname } = useLocation();

	useEffect(() => {
		if (open) dialog.current?.showModal();
		else dialog.current?.close();
	}, [open]);
	// Close after following a link
	useEffect(() => setOpen(false), [pathname]);

	const item = 'block rounded-lg px-5 py-2.5 text-lg leading-[1.5]';
	const idle = 'tracking-tight hover:bg-white/50';

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
				className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-light-blue p-0 text-dark-blue backdrop:bg-dark-blue/45"
			>
				<div className="flex flex-col gap-1 px-4 pt-5 pb-6">
					<div className="flex items-center pb-2 pl-3">
						<p className="min-w-0 flex-1 truncate font-display text-xl leading-[1.5]">{title}</p>
						<button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="-m-1 rounded p-1 hover:bg-white/50">
							<img src={close} alt="" width={28} height={28} />
						</button>
					</div>
					<nav aria-label="Main">
						<ul className="flex flex-col gap-1">
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
					<div className="my-2 h-px bg-med-blue/40" />
					<ul className="flex flex-col gap-1">
						{[...extras, { label: 'Sign out', onSelect: signOut }].map((x) => (
							<li key={x.label}>
								{x.href && !x.disabled ? (
									<a href={x.href} target="_blank" rel="noreferrer" className={`${item} ${idle}`}>
										{x.label}
									</a>
								) : x.to && !x.disabled ? (
									<NavLink to={x.to} end className={`${item} ${idle}`}>
										{x.label}
									</NavLink>
								) : (
									<button
										type="button"
										disabled={x.disabled || !x.onSelect}
										onClick={x.onSelect}
										className={`${item} ${idle} w-full text-left disabled:opacity-45 disabled:hover:bg-transparent`}
									>
										{x.label}
									</button>
								)}
							</li>
						))}
					</ul>
					<div className="flex flex-col gap-0.5 pt-3 pl-3 leading-[1.5]">
						<p className="truncate font-display text-lg">{me?.name ?? session?.email}</p>
						<p className="text-sm text-med-blue">{me ? roleLabel(me.role) : ''}</p>
					</div>
				</div>
			</dialog>
		</>
	);
}
