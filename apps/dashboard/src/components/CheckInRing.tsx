import type { CheckInStatus } from '@checkpad/shared/events';

// Figma "Check-in badge", drawn at its full 132px and scaled as a whole: full size on desktop
// (larger than the rest of the dashboard's 75% so the count stands out), 60% on phones as in
// the "Events (mobile)" sketch.
const SIZE = 132;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
	checkedIn: number;
	total: number;
	status: CheckInStatus;
	scale?: number;
}

// The states: Live while check-in is open (a dark-blue arc of checked in / total), Full once
// everyone's in (the whole ring dark blue), Upcoming before it opens (just the registrations),
// and Closed afterwards (muted to mid-blue, showing who attended).
export default function CheckInRing({ checkedIn, total, status, scale = 1 }: Props) {
	const upcoming = status === 'not-open';
	const closed = status === 'closed';
	const full = status === 'open' && total > 0 && checkedIn >= total;
	const progress = upcoming || full || total === 0 ? 0 : Math.min(checkedIn / total, 1);
	return (
		<div className="relative shrink-0" style={{ width: SIZE * scale, height: SIZE * scale }}>
			<div className="absolute top-0 left-0 origin-top-left" style={{ width: SIZE, height: SIZE, scale: String(scale) }}>
				<svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none" aria-hidden="true" className="absolute inset-0 -rotate-90">
					<circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={full ? 'var(--color-dark-blue)' : 'var(--color-light-blue)'} strokeWidth={STROKE} />
					{progress > 0 && (
						<circle
							cx={SIZE / 2}
							cy={SIZE / 2}
							r={RADIUS}
							stroke={closed ? 'var(--color-med-blue)' : 'var(--color-dark-blue)'}
							strokeWidth={STROKE}
							strokeLinecap="round"
							strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
						/>
					)}
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center text-center whitespace-nowrap">
					<p className={`flex items-baseline gap-px ${closed ? 'text-med-blue' : 'text-dark-blue'}`}>
						<span className="font-display text-[32px] leading-9 tracking-normal">{upcoming ? total : checkedIn}</span>
						{!upcoming && <span className={`text-base leading-5 ${closed ? '' : 'text-med-blue'}`}>/{total}</span>}
					</p>
					<p className="text-sm leading-5 text-med-blue">{upcoming ? 'registered' : closed ? 'attended' : 'checked in'}</p>
				</div>
			</div>
		</div>
	);
}
