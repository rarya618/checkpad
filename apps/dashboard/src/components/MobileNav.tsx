import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import close from '../assets/close.svg';
import moreIcon from '../assets/more.svg';
import { signOut, useSession } from '../lib/auth';
import { roleLabel, useCurrentOrganiser } from '../lib/organisers';
import type { SidebarItem } from './Sidebar';

export interface MobileNavConfig {
	/** Heading at the top of the More sheet, e.g. the event name. */
	title: string;
	/** The tab bar's tabs, before More. */
	items: SidebarItem[];
	/**
	 * In the More sheet, above Sign out: links out of this section, or actions not built yet.
	 * `href` opens in a new tab: a full-screen display for the venue's projector.
	 */
	extras: { label: string; to?: string; href?: string; disabled?: boolean; onSelect?: () => void }[];
}

// Phones get Figma "Staff check in (mobile)"'s top bar instead of the sidebar, and a tab
// bar along the bottom (not in Figma) with the section's pages. Its last tab, More, opens
// the rest of Figma's menu ("– menu") as a sheet from the bottom.
export default function MobileNav({ title, items, extras }: MobileNavConfig) {
	const [open, setOpen] = useState(false);
	const session = useSession();
	const me = useCurrentOrganiser();
	const dialog = useRef<HTMLDialogElement>(null);
	const closing = useRef<Animation[]>([]);
	const { pathname } = useLocation();
	const typing = useTyping();

	useEffect(() => {
		const d = dialog.current;
		if (!d) return;
		if (open) {
			// Reopened mid-close: drop the closing slide so the sheet stays put
			closing.current.forEach((a) => a.cancel());
			if (!d.open) d.showModal();
			return;
		}
		if (!d.open) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			d.close();
			return;
		}
		// Slides back down with its scrim (opening is CSS: index.css), then closes
		const timing = { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)' };
		closing.current = [
			d.animate({ translate: ['0 0', '0 100%'] }, timing),
			d.animate({ opacity: [1, 0] }, { ...timing, pseudoElement: '::backdrop' }),
		];
		closing.current[0].finished.then(() => d.close(), () => {});
	}, [open]);
	// Close after following a link
	useEffect(() => setOpen(false), [pathname]);

	// The sidebar's text sizes, with slightly taller rows to tap
	const item = 'block rounded-lg px-5 py-2 text-base leading-[1.5] tracking-tight hover:bg-white/50';
	const tab = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5';

	return (
		<>
			<header className="px-5 pt-5 pb-6">
				<img src={logo} alt="checkpad" width={134} height={32} />
			</header>
			{/* A card like the sidebar, inset 20px like the logo: App.tsx keeps the page and toasts
			    clear of its 84px. Hidden while typing, so it doesn't ride up above the keyboard. */}
			<nav
				aria-label="Main"
				hidden={typing}
				className="fixed inset-x-5 bottom-5 z-20 flex h-16 rounded-[18px] border border-med-blue bg-light-blue px-1.5"
			>
				{items.map((i) => (
					<NavLink key={i.to} to={i.to} end={i.end} className={tab}>
						{({ isActive }) => <Tab icon={i.icon} label={i.label} active={isActive} />}
					</NavLink>
				))}
				<button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className={tab}>
					<Tab icon={moreIcon} label="More" active={open} />
				</button>
			</nav>
			<dialog
				ref={dialog}
				data-drawer
				aria-label="More"
				onClose={() => setOpen(false)}
				// Escape slides it away too, instead of closing at once
				onCancel={(e) => {
					e.preventDefault();
					setOpen(false);
				}}
				onClick={(e) => e.target === e.currentTarget && setOpen(false)}
				className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-light-blue p-0 text-dark-blue backdrop:bg-dark-blue/45"
			>
				<div className="flex flex-col gap-1 px-4 pt-5 pb-6">
					<div className="flex items-center pb-2 pl-3">
						<p className="min-w-0 flex-1 truncate font-display text-lg leading-[1.5]">{title}</p>
						<button type="button" aria-label="Close" onClick={() => setOpen(false)} className="-m-1 rounded p-1 hover:bg-white/50">
							<img src={close} alt="" width={28} height={28} />
						</button>
					</div>
					<ul className="flex flex-col gap-1">
						{[...extras, { label: 'Sign out', onSelect: signOut }].map((x) => (
							<li key={x.label}>
								{x.href && !x.disabled ? (
									<a href={x.href} target="_blank" rel="noreferrer" className={item}>
										{x.label}
									</a>
								) : x.to && !x.disabled ? (
									<NavLink to={x.to} end className={item}>
										{x.label}
									</NavLink>
								) : (
									<button
										type="button"
										disabled={x.disabled || !x.onSelect}
										onClick={x.onSelect}
										className={`${item} w-full text-left disabled:opacity-45 disabled:hover:bg-transparent`}
									>
										{x.label}
									</button>
								)}
							</li>
						))}
					</ul>
					<div className="my-2 h-px bg-med-blue/40" />
					<div className="flex flex-col gap-0.5 pl-3 leading-[1.5]">
						<p className="truncate font-display text-lg">{me?.name ?? session?.email}</p>
						<p className="text-sm text-med-blue">{me ? roleLabel(me.role) : ''}</p>
					</div>
				</div>
			</dialog>
		</>
	);
}

// An icon in a pill over a label. The current page's pill is dark with a white icon, like
// the sidebar's selected item.
function Tab({ icon, label, active }: { icon?: string; label: string; active: boolean }) {
	return (
		<>
			<span className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${active ? 'bg-dark-blue' : ''}`}>
				{icon && <img src={icon} alt="" width={22} height={22} className={active ? 'brightness-0 invert' : ''} />}
			</span>
			<span className={`max-w-full truncate text-xs leading-[1.5] ${active ? 'font-display' : 'tracking-tight'}`}>{label}</span>
		</>
	);
}

/** Whether a text field has focus, so the phone's keyboard is (or is about to be) up. */
function useTyping() {
	const [typing, setTyping] = useState(false);
	useEffect(() => {
		const update = () => setTyping(isTextField(document.activeElement));
		document.addEventListener('focusin', update);
		document.addEventListener('focusout', update);
		return () => {
			document.removeEventListener('focusin', update);
			document.removeEventListener('focusout', update);
		};
	}, []);
	return typing;
}

function isTextField(el: Element | null) {
	return !!el?.matches('textarea, [contenteditable], input:not([type=checkbox], [type=radio], [type=button], [type=submit], [type=file])');
}
