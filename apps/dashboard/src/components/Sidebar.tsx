import logo from '@checkpad/shared/checkpad-logo.svg';
import { formatDate } from '@checkpad/shared/format';
import { Link, NavLink, useLocation } from 'react-router';
import arrow from '../assets/arrow-right.svg';
import chevron from '../assets/chevron-down.svg';
import ellipsis from '../assets/ellipsis-vertical.svg';
import logout from '../assets/logout.svg';
import switchIcon from '../assets/switch.svg';
import { signOut, useSession } from '../lib/auth';
import { eventPhase, groupOf, nowStatus } from '../lib/eventPhase';
import { useEventSummaries, type DashboardEvent, type EventSummary } from '../lib/events';
import { initialsOf, roleLabel, useCurrentOrganiser } from '../lib/organisers';
import Menu, { type MenuItem } from './Menu';
import StatusBadge from './StatusBadge';
import { eventNameBack, useTransitionLink, useTransitionLinks } from '../lib/pageTransition';

export interface SidebarItem {
	to: string;
	label: string;
	/** Only highlight on an exact URL match (for an item whose URL prefixes others). */
	end?: boolean;
	/** Beside the label in the sidebar, and above it in the phones' tab bar. */
	icon?: string;
	/** Opens inside a view transition (pageTransition): only for a page that calls usePageArrival. */
	transition?: boolean;
	/** Fetches a lazily loaded page's file when the item is pointed at, focused or pressed. */
	preload?: () => void;
}

/** A way out of a section, e.g. from an event back to all events. */
export interface BackLink {
	to: string;
	label: string;
}

/** A page that opens in a new tab, e.g. a full-screen display for the venue's projector. */
export interface ScreenLink {
	href: string;
	label: string;
}

export interface SidebarProps {
	items: SidebarItem[];
	back?: BackLink;
	/** Under the menu, headed "Screens". */
	screens?: ScreenLink[];
	/** The event whose pages these are: its name heads the menu and switches to another event. */
	event?: DashboardEvent;
}

// The sidebar is a quiet column on the page's own ground, edged by a hairline, so the page
// reads first. On the main pages, the space under the menu shows what's on now (or next), a
// click from its Check in page. Inside an event, the event's name heads its menu and switches
// to another event's same page.
export default function Sidebar({ items, back, screens, event }: SidebarProps) {
	// Leaving an event for Events: its title returns to its row (pageTransition)
	const goBack = useTransitionLink(back?.to ?? '/events', eventNameBack);
	const transitionTo = useTransitionLinks();
	const { pathname } = useLocation();
	return (
		<aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-line pt-8 pb-4">
			{/* Level with the page titles, 32px down (PageHeader) */}
			<Link to="/events" className="mx-6 self-start py-0.5">
				<img src={logo} alt="checkpad" width={146} height={32} />
			</Link>
			{/* Outside the scrolling part below, which would clip the switcher's list */}
			{event && (
				<div className="flex flex-col gap-2 px-4 pt-8">
					{back && (
						<Link to={back.to} onClick={goBack} className="flex items-center gap-2 self-start rounded-md px-2 py-1 text-sm leading-normal text-med-blue hover:text-dark-blue">
							<img src={arrow} alt="" width={16} height={16} className="rotate-180" />
							{back.label}
						</Link>
					)}
					<EventSwitcher event={event} />
				</div>
			)}
			<div className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 ${event ? 'pt-4' : 'pt-8'}`}>
				<nav aria-label={event ? `${event.name}’s pages` : 'Main'}>
					<ul className="flex flex-col gap-0.5">
						{items.map((item) => (
							<li key={item.to}>
								<NavLink
									to={item.to}
									end={item.end}
									onClick={item.transition ? transitionTo(item.to) : undefined}
									onPointerEnter={item.preload}
									onFocus={item.preload}
									className={({ isActive }) =>
										`flex items-center gap-3 rounded-lg px-3 py-2 text-base leading-normal text-dark-blue transition-colors ${
											isActive ? 'bg-light-blue font-bold' : 'hover:bg-light-blue/50'
										}`
									}
								>
									{item.icon && <img src={item.icon} alt="" width={18} height={18} className="shrink-0" />}
									{item.label}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
				{screens && screens.length > 0 && (
					<section aria-labelledby="sidebar-screens" className="flex flex-col gap-1">
						<h2 id="sidebar-screens" className="px-3 text-xs leading-normal text-med-blue">
							Screens
						</h2>
						<ul className="flex flex-col gap-0.5">
							{screens.map((screen) => (
								<li key={screen.href}>
									<a
										href={screen.href}
										target="_blank"
										rel="noreferrer"
										className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-base leading-normal text-dark-blue transition-colors hover:bg-light-blue/50"
									>
										{screen.label}
										{/* The right arrow turned up: opens in a new tab */}
										<img src={arrow} alt="(opens in a new tab)" width={16} height={16} className="-rotate-45 opacity-70" />
									</a>
								</li>
							))}
						</ul>
					</section>
				)}
				{/* Not on Events, which leads with the same events */}
				{!event && pathname !== '/events' && <OnNow />}
			</div>
			<div className="mx-4 flex items-center gap-3 border-t border-line px-2 pt-4">
				<AccountSummary />
				<AccountMenu />
			</div>
		</aside>
	);
}

// Now and Upcoming soonest first; events left open after they ended go after tonight's
const byStart = (a: EventSummary, b: EventSummary) => a.event.startsAt.localeCompare(b.event.startsAt);
const staleLast = (a: EventSummary, b: EventSummary) =>
	Number(eventPhase(a.event) === 'stale-open') - Number(eventPhase(b.event) === 'stale-open') || byStart(a, b);

function grouped(summaries: EventSummary[]) {
	const now: EventSummary[] = [];
	const upcoming: EventSummary[] = [];
	const past: EventSummary[] = [];
	for (const s of summaries) ({ now, upcoming, past })[groupOf(eventPhase(s.event))].push(s);
	return { now: now.sort(staleLast), upcoming: upcoming.sort(byStart), past: past.sort((a, b) => byStart(b, a)) };
}

// The main pages' sidebar, under the menu: the events on now, each a click from its Check in
// page with its live count, or else the next one coming up. Nothing when there's neither.
function OnNow() {
	const { now, upcoming } = grouped(useEventSummaries());
	if (now.length === 0 && upcoming.length === 0) return null;
	const live = now.length > 0;
	return (
		<section aria-labelledby="sidebar-now" className="flex flex-col gap-1">
			<h2 id="sidebar-now" className="px-3 text-xs leading-normal text-med-blue">
				{live ? 'Now' : 'Next'}
			</h2>
			<ul className="flex flex-col gap-1">
				{live
					? now.slice(0, 3).map(({ event, stats }) => {
							const status = nowStatus[eventPhase(event)]!;
							return (
								<li key={event.id}>
									<Link
										to={`/events/${event.slug}/check-in`}
										className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 leading-normal transition-colors hover:bg-light-blue/50 ${status.open ? 'bg-light-blue/40' : ''}`}
									>
										<StatusBadge open={status.open} label={status.label} />
										<span className="line-clamp-2 text-sm font-bold text-dark-blue">{event.name}</span>
										<span className="text-xs text-med-blue tabular-nums">
											{stats.checkedIn} checked in, of {stats.total}
										</span>
									</Link>
								</li>
							);
						})
					: upcoming.slice(0, 1).map(({ event }) => (
							<li key={event.id}>
								<Link to={`/events/${event.slug}`} className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 leading-normal transition-colors hover:bg-light-blue/50">
									<span className="line-clamp-2 text-sm font-bold text-dark-blue">{event.name}</span>
									<span className="text-xs text-med-blue">{formatDate(new Date(event.startsAt), event.timeZone)}</span>
								</Link>
							</li>
						))}
			</ul>
		</section>
	);
}

/**
 * The events to switch to from `event`'s pages (on now, the next six coming up, the last three),
 * each opening the same page of that event, with its status or date beneath. Also the phones'
 * top bar (MobileNav).
 */
export function useEventSwitchItems(event: DashboardEvent | undefined): MenuItem[] {
	const { pathname } = useLocation();
	const { now, upcoming, past } = grouped(useEventSummaries());
	if (!event) return [];
	const page = pathname.slice(`/events/${event.slug}`.length);
	const item = ({ event: e }: EventSummary): MenuItem => ({
		label: e.name,
		detail: nowStatus[eventPhase(e)]?.label ?? formatDate(new Date(e.startsAt), e.timeZone),
		to: `/events/${e.slug}${page}`,
		current: e.id === event.id,
	});
	const groups = [now, upcoming.slice(0, 6), past.slice(0, 3)].filter((g) => g.length > 0);
	return groups.flatMap((g, i) => g.map((s, j) => ({ ...item(s), separated: i > 0 && j === 0 })));
}

// The event's name and date head its menu; pressing them lists the other events to switch to
function EventSwitcher({ event }: { event: DashboardEvent }) {
	const items = useEventSwitchItems(event);
	const status = nowStatus[eventPhase(event)];
	return (
		<Menu
			label={`${event.name}: switch to another event`}
			placement="below-left"
			menuWidth="w-[280px]"
			buttonClassName="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-light-blue/50 aria-expanded:bg-light-blue/50"
			items={items}
		>
			<span className="flex min-w-0 flex-1 flex-col gap-1 leading-normal">
				<span className="line-clamp-3 font-display text-lg leading-tight text-dark-blue">{event.name}</span>
				<span className="text-sm text-med-blue">{formatDate(new Date(event.startsAt), event.timeZone)}</span>
				{status && <StatusBadge open={status.open} label={status.label} />}
			</span>
			<img src={chevron} alt="" width={18} height={18} className="mt-0.5 shrink-0" />
		</Menu>
	);
}

function AccountSummary() {
	const session = useSession();
	const me = useCurrentOrganiser();
	return (
		<div className="flex min-w-0 flex-1 items-center gap-3">
			{me && (
				<span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-sm">
					{initialsOf(me)}
				</span>
			)}
			<div className="flex min-w-0 flex-col">
				<p className="truncate font-display text-base leading-tight">{me?.name ?? session?.email}</p>
				<p className="text-xs leading-normal text-med-blue">{me ? roleLabel(me.role) : ''}</p>
			</div>
		</div>
	);
}

// Figma "Events – account menu": who is signed in, then Switch account and Sign out.
function AccountMenu() {
	const session = useSession();
	const me = useCurrentOrganiser();
	if (!session) return null;
	return (
		<Menu
			label="Account options"
			placement="above-left"
			buttonClassName="rounded-md p-1 hover:bg-light-blue/50"
			header={
				<div className="flex flex-col gap-0.5 px-2.5 pt-2 pb-2.5 leading-normal">
					<p className="text-xs text-med-blue">Signed in as</p>
					<p className="truncate text-sm font-bold">{session.email}</p>
					<p className="text-xs text-med-blue">
						{me ? roleLabel(me.role) : 'Organiser'} · via {session.method === 'google' ? 'Google' : 'email link'}
					</p>
				</div>
			}
			items={[
				{ label: 'Switch account', icon: switchIcon, onSelect: signOut },
				{ label: 'Sign out', icon: logout, onSelect: signOut },
			]}
		>
			<img src={ellipsis} alt="" width={18} height={18} />
		</Menu>
	);
}
