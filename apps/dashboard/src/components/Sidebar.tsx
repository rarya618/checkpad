import logo from '@checkpad/shared/checkpad-logo.svg';
import { Link, NavLink } from 'react-router';
import arrow from '../assets/arrow-right.svg';
import ellipsis from '../assets/ellipsis-vertical.svg';
import logout from '../assets/logout.svg';
import switchIcon from '../assets/switch.svg';
import { signOut, useSession } from '../lib/auth';
import { roleLabel, useCurrentOrganiser } from '../lib/organisers';
import Menu from './Menu';

export interface SidebarItem {
	to: string;
	label: string;
	/** Only highlight on an exact URL match (for an item whose URL prefixes others). */
	end?: boolean;
	/** Shown in the phones' tab bar; the sidebar is text only. */
	icon?: string;
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
}

export default function Sidebar({ items, back, screens }: SidebarProps) {
	return (
		<aside className="flex h-full w-[270px] shrink-0 flex-col justify-between rounded-xl border border-med-blue bg-light-blue px-4 pt-7.5 pb-4">
			<div className="flex w-full flex-col gap-5">
				<Link to="/events" className="self-start px-3 py-1">
					<img src={logo} alt="checkpad" width={151} height={36} />
				</Link>
				<nav aria-label="Main" className="flex flex-col gap-3">
					{back && (
						<Link
							to={back.to}
							className="flex items-center gap-2 border-b border-med-blue/50 px-3 pb-3 text-sm tracking-[-0.01em] text-med-blue hover:text-dark-blue"
						>
							<img src={arrow} alt="" width={18} height={18} className="rotate-180" />
							{back.label}
						</Link>
					)}
					<ul className="flex flex-col gap-1">
						{items.map((item) => (
							<li key={item.to}>
								<NavLink
									to={item.to}
									end={item.end}
									className={({ isActive }) =>
										`block rounded-md px-5 py-1.5 text-base ${
											isActive ? 'bg-dark-blue font-display tracking-[0.01em] text-off-white' : 'tracking-[-0.01em] hover:bg-white/50'
										}`
									}
								>
									{item.label}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
				{screens && screens.length > 0 && (
					<section aria-labelledby="sidebar-screens" className="flex flex-col gap-1">
						<h2 id="sidebar-screens" className="px-5 pb-1 text-xs tracking-[0.01em] text-med-blue">
							Screens
						</h2>
						<ul className="flex flex-col gap-1">
							{screens.map((screen) => (
								<li key={screen.href}>
									<a
										href={screen.href}
										target="_blank"
										rel="noreferrer"
										className="flex items-center justify-between rounded-md px-5 py-1.5 text-base tracking-[-0.01em] hover:bg-white/50"
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
			</div>
			<div className="flex w-full items-center justify-between border-t border-med-blue/50 px-3.5 py-5">
				<AccountSummary />
				<AccountMenu />
			</div>
		</aside>
	);
}

function AccountSummary() {
	const session = useSession();
	const me = useCurrentOrganiser();
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			{/* Smaller than Figma's 28px at 75% scale, to sit with the menu items; 1.2 line height, not text-lg's 1.5 */}
			<p className="truncate font-display text-lg leading-tight">{me?.name ?? session?.email}</p>
			<p className="text-sm text-med-blue">{me ? roleLabel(me.role) : ''}</p>
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
			buttonClassName="rounded-md p-1 hover:bg-white/50"
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
