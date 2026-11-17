import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import arrow from '../assets/arrow-right.svg';
import close from '../assets/close.svg';
import moreIcon from '../assets/more.svg';
import { signOut, useSession } from '../lib/auth';
import { roleLabel, useCurrentOrganiser } from '../lib/organisers';
import calendar from '../assets/calendar.svg';
import chevron from '../assets/chevron-down.svg';
import type { DashboardEvent } from '../lib/events';
import Menu from './Menu';
import { useEventSwitchItems, type BackLink, type SidebarItem } from './Sidebar';
import { eventNameBack, useTransitionLink, useTransitionLinks, useTransitionNavigate } from '../lib/pageTransition';

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
	/** In the top bar, opposite the logo: a way out of this section. */
	back?: BackLink;
	/** Inside an event, the way out becomes a menu that also switches to another event. */
	event?: DashboardEvent;
}

// Phones get Figma "Staff check in (mobile)"'s top bar instead of the sidebar, and a tab
// bar along the bottom (not in Figma) with the section's pages. Its last tab, More, opens
// the rest of Figma's menu ("– menu") as a sheet from the bottom.
export default function MobileNav({ title, items, extras, back, event }: MobileNavConfig) {
	const goBack = useTransitionLink(back?.to ?? '/events', eventNameBack);
	const transitionTo = useTransitionLinks();
	const [open, setOpen] = useState(false);
	const session = useSession();
	const me = useCurrentOrganiser();
	const dialog = useRef<HTMLDialogElement>(null);
	const closing = useRef<Animation[]>([]);
	const { pathname } = useLocation();
	const keyboardOpen = useKeyboardOpen();
	const switchItems = useEventSwitchItems(event);
	const go = useTransitionNavigate();

	useEffect(() => {
		const d = dialog.current;
		if (!d) return;
		if (open) {
			// Reopened mid-close: drop the closing slide so the sheet stays put
			closing.current.forEach((a) => a.cancel());
			if (!d.open) {
				d.showModal();
				// Focus the sheet, not its first button, so the close button doesn't open with a focus ring
				d.focus();
			}
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
	const item = 'block rounded-lg px-5 py-2 text-base leading-normal tracking-[0.01em] hover:bg-light-blue/60';
	const tab = 'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5';

	return (
		<>
			<header className="flex items-center justify-between gap-4 px-5 pt-5 pb-6">
				<Link to="/events">
					<img src={logo} alt="checkpad" width={146} height={32} />
				</Link>
				{back && event ? (
					// All events, then the events to switch to (the sidebar's switcher)
					<Menu
						label="Switch event"
						menuWidth="w-[280px]"
						buttonClassName="-my-2 -mr-2 flex items-center gap-1 rounded-md py-2 pr-2 pl-2.5 text-sm tracking-[-0.01em] text-med-blue aria-expanded:bg-light-blue/60"
						items={[
							// Its title returns to its row on Events, as the link does
							{ label: back.label, icon: calendar, onSelect: () => go(back.to, eventNameBack()) },
							...switchItems.map((x, i) => (i === 0 ? { ...x, separated: true } : x)),
						]}
					>
						Switch event
						<img src={chevron} alt="" width={18} height={18} />
					</Menu>
				) : (
					back && (
						<Link to={back.to} onClick={goBack} className="-my-2 flex items-center gap-1.5 py-2 text-sm tracking-[-0.01em] text-med-blue">
							<img src={arrow} alt="" width={18} height={18} className="rotate-180" />
							{back.label}
						</Link>
					)
				)}
			</header>
			{/* A bar across the bottom edge: 64px of tabs over 16px of padding, which keeps them up from
			    the edge of the screen. App.tsx keeps the page and toasts clear of its 80px. Away while
			    the on-screen keyboard is up, so it doesn't ride up above it: it tucks down out of the
			    keyboard's way and rises back once it's gone (index.css), and can't be reached meanwhile. */}
			<nav
				aria-label="Main"
				data-tabbar
				data-away={keyboardOpen || undefined}
				inert={keyboardOpen}
				className="fixed inset-x-0 bottom-0 z-20 flex h-20 bg-off-white px-1.5 pb-4"
			>
				{items.map((i) => (
					<NavLink
						key={i.to}
						to={i.to}
						end={i.end}
						onClick={i.transition ? transitionTo(i.to) : undefined}
						onPointerDown={i.preload}
						className={tab}
					>
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
				tabIndex={-1}
				onClose={() => setOpen(false)}
				// Escape slides it away too, instead of closing at once
				onCancel={(e) => {
					e.preventDefault();
					setOpen(false);
				}}
				onClick={(e) => e.target === e.currentTarget && setOpen(false)}
				className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-off-white p-0 text-dark-blue outline-none backdrop:bg-dark-blue/45"
			>
				<div className="flex flex-col gap-1 px-4 pt-5 pb-6">
					<div className="flex items-center pb-2 pl-3">
						<p className="min-w-0 flex-1 truncate font-display text-lg leading-normal">{title}</p>
						<button type="button" aria-label="Close" onClick={() => setOpen(false)} className="-m-1 rounded p-1 hover:bg-light-blue/60">
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
					{/* Who's signed in, leading to their Profile page */}
					<Link to="/profile" className="flex items-center justify-between gap-3 rounded-lg py-2 pr-2 pl-3 leading-normal hover:bg-light-blue/60">
						<span className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate font-display text-lg">{me?.name ?? session?.email}</span>
							<span className="text-sm text-dark-blue/75">{me ? `${roleLabel(me.role)} · Your profile` : 'Your profile'}</span>
						</span>
						<img src={arrow} alt="" width={18} height={18} className="shrink-0" />
					</Link>
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
			<span className={`max-w-full truncate text-xs leading-normal tracking-[0.01em] ${active ? 'font-display' : ''}`}>{label}</span>
		</>
	);
}

// Taller than any browser toolbar that slides in and out, shorter than any on-screen keyboard
const KEYBOARD_MIN_HEIGHT = 150;

/** Somewhere typing brings up the on-screen keyboard. */
const typesText = (el: Element | null) =>
	el instanceof HTMLTextAreaElement ||
	(el instanceof HTMLElement && el.isContentEditable) ||
	(el instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color', 'image'].includes(el.type));

/**
 * Whether the on-screen keyboard is up: it shrinks the visible area (the visual viewport) while
 * the page keeps its height. Pinch zoom shrinks the visual viewport too, so its height is
 * measured at the page's scale. A narrow desktop window, or a phone with a hardware keyboard,
 * never shrinks, so typing there keeps the tab bar.
 *
 * It goes as soon as the field loses focus, not when the viewport says so: phones report the
 * resize only once the keyboard has finished sliding away, which would hold the tab bar back for
 * the whole of it. Moving straight to another field keeps the keyboard, so that doesn't count.
 */
function useKeyboardOpen() {
	const [open, setOpen] = useState(false);
	useEffect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		// Only with a field focused: a resize from a keyboard still on its way down doesn't count
		const update = () =>
			setOpen(typesText(document.activeElement) && window.innerHeight - viewport.height * viewport.scale > KEYBOARD_MIN_HEIGHT);
		const onFocusOut = (e: FocusEvent) => {
			if (typesText(e.target as Element) && !typesText(e.relatedTarget as Element | null)) setOpen(false);
		};
		update();
		viewport.addEventListener('resize', update);
		document.addEventListener('focusout', onFocusOut);
		return () => {
			viewport.removeEventListener('resize', update);
			document.removeEventListener('focusout', onFocusOut);
		};
	}, []);
	return open;
}
