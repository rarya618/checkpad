import type { RosterStats } from '../lib/roster';
import CheckInBar from './CheckInBar';
import RollingCount from './RollingCount';

export default function StatsCard({ stats }: { stats: RosterStats }) {
	const keys = [
		{ label: 'Pre-registered', count: stats.preRegistered, color: 'bg-dark-blue' },
		{ label: stats.walkIns === 1 ? 'Walk-in' : 'Walk-ins', count: stats.walkIns, color: 'bg-med-blue' },
		{ label: 'Not arrived', count: stats.notArrived, color: 'bg-light-blue' },
	];
	return (
		<section aria-label="Check-in progress" className="flex flex-col gap-4 rounded-xl border border-med-blue bg-white px-6 pt-6 pb-4 tabular-nums">
			<div className="flex items-baseline justify-between gap-6">
				<p className="flex items-baseline gap-2.5">
					<RollingCount value={stats.checkedIn} className="font-display text-4xl leading-none" />
					<span className="text-base leading-none tracking-tight text-med-blue">checked in</span>
				</p>
				<p className="flex items-baseline gap-2.5">
					<span className="text-base leading-none tracking-tight text-med-blue">out of</span>
					<span className="font-display text-4xl leading-none">{stats.total}</span>
				</p>
			</div>
			<div className="flex flex-col gap-2">
				<CheckInBar stats={stats} />
				<ul className="flex flex-wrap gap-x-6 gap-y-1 py-2">
					{keys.map((key) => (
						<li key={key.color} className="flex items-center gap-2">
							<span aria-hidden="true" className={`size-2 rounded-full ${key.color}`} />
							<span className="flex items-center gap-2 text-dark-blue">
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
