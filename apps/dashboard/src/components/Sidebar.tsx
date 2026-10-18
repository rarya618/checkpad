import logo from '@checkpad/shared/checkpad-logo.svg';
import { NavLink } from 'react-router';
import ellipsis from '../assets/ellipsis-vertical.svg';
import { currentUser } from '../lib/mock';

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
					<img src={logo} alt="checkpad" width={176} height={42} />
				</div>
				<nav aria-label="Main">
					<ul className="flex flex-col gap-1.5">
						{items.map((item) => (
							<li key={item.to}>
								<NavLink
									to={item.to}
									end={item.end}
									className={({ isActive }) =>
										`block rounded-[6px] px-[21px] py-[9px] text-lg ${
											isActive ? 'bg-dark-blue font-display text-off-white' : 'tracking-[-0.45px] hover:bg-white/50'
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
				<div className="flex flex-col gap-[4.5px]">
					{/* Figma's 28px name at 75% scale: 1.2 line height, not text-xl's 1.5 */}
					<p className="font-display text-xl leading-[1.2]">{currentUser.name}</p>
					<p className="text-sm text-med-blue">{currentUser.role}</p>
				</div>
				{/* The account menu isn't designed yet */}
				<button type="button" aria-label="Account options" className="rounded-md p-1 hover:bg-white/50">
					<img src={ellipsis} alt="" width={18} height={18} />
				</button>
			</div>
		</aside>
	);
}
