import type { RosterStats } from '../lib/roster';

export default function StatsCard({ stats }: { stats: RosterStats }) {
	const pct = (n: number) => `${stats.total ? (n / stats.total) * 100 : 0}%`;
	const keys = [
		{ label: 'Pre-registered', count: stats.preRegistered, color: 'bg-dark-blue' },
		{ label: stats.walkIns === 1 ? 'Walk-in' : 'Walk-ins', count: stats.walkIns, color: 'bg-med-blue' },
		{ label: 'Not arrived', count: stats.notArrived, color: 'bg-light-blue' },
	];
	return (
		<section aria-label="Check-in progress" className="flex flex-col gap-4 rounded-xl border border-med-blue bg-white px-6 pt-6 pb-4">
			<div className="flex items-baseline justify-between gap-6">
				<p className="flex items-baseline gap-2.5">
					<span className="font-display text-4xl leading-none">{stats.checkedIn}</span>
					<span className="text-base leading-none tracking-tight text-med-blue">checked in</span>
				</p>
				<p className="flex items-baseline gap-2.5">
					<span className="text-base leading-none tracking-tight text-med-blue">out of</span>
					<span className="font-display text-4xl leading-none">{stats.total}</span>
				</p>
			</div>
			<div className="flex flex-col gap-2">
				<div aria-hidden="true" className="flex h-2 gap-px overflow-hidden rounded-full bg-off-white">
					{stats.preRegistered > 0 && <div className="bg-dark-blue" style={{ width: pct(stats.preRegistered) }} />}
					{stats.walkIns > 0 && <div className="bg-med-blue" style={{ width: pct(stats.walkIns) }} />}
					<div className="flex-1 bg-light-blue" />
				</div>
				<ul className="flex flex-wrap gap-x-6 gap-y-1 py-2">
					{keys.map((key) => (
						<li key={key.color} className="flex items-center gap-2">
							<span aria-hidden="true" className={`size-2 rounded-full ${key.color}`} />
							<span className="flex items-center gap-2 text-black">
								<span className="font-display text-base">{key.count}</span>
								<span className="text-sm tracking-tight">{key.label}</span>
							</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
