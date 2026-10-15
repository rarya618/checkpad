const SIZE = 99;
const STROKE = 7.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
	checkedIn: number;
	total: number;
}

// Figma "Badge": a light-blue track with a round-capped dark-blue arc starting at the top.
export default function CheckInRing({ checkedIn, total }: Props) {
	const progress = total > 0 ? Math.min(checkedIn / total, 1) : 0;
	return (
		<div className="relative size-[99px] shrink-0">
			<svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none" aria-hidden="true" className="absolute inset-0 -rotate-90">
				<circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="var(--color-light-blue)" strokeWidth={STROKE} />
				{progress > 0 && (
					<circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						stroke="var(--color-dark-blue)"
						strokeWidth={STROKE}
						strokeLinecap="round"
						strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
					/>
				)}
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center gap-2.25 text-center">
				<div className="flex flex-col items-center">
					<p className="font-display text-3xl leading-[33px]">{checkedIn}</p>
					<p className="text-xs text-med-blue">checked in</p>
				</div>
				{/* 12px floor: the design's 11px label scaled to 75% would be unreadable */}
				<p className="text-xs">{total} total</p>
			</div>
		</div>
	);
}
