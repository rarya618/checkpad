import type { RosterStats } from '../lib/roster';

export default function StatsCard({ stats }: { stats: RosterStats }) {
	const pct = (n: number) => `${stats.total ? (n / stats.total) * 100 : 0}%`;
	const keys = [
		{ label: 'Pre-registered', count: stats.preRegistered, color: 'bg-dark-blue' },
		{ label: stats.walkIns === 1 ? 'Walk-in' : 'Walk-ins', count: stats.walkIns, color: 'bg-med-blue' },
		{ label: 'Not arrived', count: stats.notArrived, color: 'bg-light-blue' },
	];
	return (
		<section aria-label="Check-in progress" className="flex flex-col gap-6 rounded-xl border border-med-blue bg-white px-7.5 pt-[33px] pb-[27px]">
			<div className="flex items-end justify-between gap-6">
				<p className="flex items-end gap-[9px]">
					<span className="font-display text-5xl leading-[42px]">{stats.checkedIn}</span>
					<span className="text-lg tracking-tight text-med-blue">checked in</span>
				</p>
				<p className="flex items-end gap-[9px]">
					<span className="text-lg tracking-tight text-med-blue">out of</span>
					<span className="font-display text-5xl leading-[41px]">{stats.total}</span>
				</p>
			</div>
			<div className="flex flex-col gap-[9px]">
				<div aria-hidden="true" className="flex h-[10.5px] gap-px overflow-hidden rounded-full bg-off-white">
					{stats.preRegistered > 0 && <div className="bg-dark-blue" style={{ width: pct(stats.preRegistered) }} />}
					{stats.walkIns > 0 && <div className="bg-med-blue" style={{ width: pct(stats.walkIns) }} />}
					<div className="flex-1 bg-light-blue" />
				</div>
				<ul className="flex flex-wrap gap-x-9 gap-y-2 p-[7.5px]">
					{keys.map((key) => (
						<li key={key.color} className="flex items-center gap-[10.5px]">
							<span aria-hidden="true" className={`size-[9px] rounded-full ${key.color}`} />
							<span className="flex items-center gap-[9px] text-black">
								<span className="font-display text-lg">{key.count}</span>
								<span className="text-[15px] tracking-tight">{key.label}</span>
							</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
