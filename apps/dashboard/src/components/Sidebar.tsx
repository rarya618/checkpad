import logo from '@checkpad/shared/checkpad-logo.svg';
import { NavLink } from 'react-router';
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
}

export default function Sidebar({ items }: { items: SidebarItem[] }) {
	return (
		<aside className="flex h-full w-[270px] shrink-0 flex-col justify-between rounded-[18px] border border-med-blue bg-light-blue px-[15px] pt-7.5 pb-[15px]">
			<div className="flex w-full flex-col gap-[21px]">
				<div className="px-3 py-[3px]">
					<img src={logo} alt="checkpad" width={151} height={36} />
				</div>
				<nav aria-label="Main">
					<ul className="flex flex-col gap-1">
						{items.map((item) => (
							<li key={item.to}>
								<NavLink
									to={item.to}
									end={item.end}
									className={({ isActive }) =>
										`block rounded-[6px] px-[21px] py-1.5 text-base ${
											isActive ? 'bg-dark-blue font-display text-off-white' : 'tracking-[-0.4px] hover:bg-white/50'
										}`
									}
								>
									{item.label}
								</NavLink>
							</li>
						))}
					</ul>
				</nav>
			</div>
			<div className="flex w-full items-center justify-between border-t border-med-blue/50 px-3.5 py-[21px]">
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
			{/* Figma's 28px name at 75% scale: 1.2 line height, not text-xl's 1.5 */}
			<p className="truncate font-display text-xl leading-[1.2]">{me?.name ?? session?.email}</p>
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
				<div className="flex flex-col gap-[1.5px] px-[10.5px] pt-[7.5px] pb-[9px] leading-[1.5]">
					<p className="text-xs text-med-blue">Signed in as</p>
					<p className="truncate text-[13.5px] font-bold">{session.email}</p>
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
