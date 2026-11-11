import type { CheckInStatus } from '@checkpad/shared/events';

// Figma "Check-in badge" (132px there), drawn at md on desktop and sm on phones. The SVG
// scales to the box, so the stroke stays in proportion; the text uses the type scale.
const SIZE = 132;
const sizes = {
	md: { box: 'size-26', count: 'text-2xl', total: 'text-sm', label: 'text-xs' },
	sm: { box: 'size-20', count: 'text-xl', total: 'text-xs', label: 'text-xs' },
};
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
	checkedIn: number;
	total: number;
	status: CheckInStatus;
	size?: keyof typeof sizes;
}

// The states: Live while check-in is open (a dark-blue arc of checked in / total), Full once
// everyone's in (the whole ring dark blue), Upcoming before it opens (just the registrations),
// and Closed afterwards (muted to mid-blue, showing who attended).
export default function CheckInRing({ checkedIn, total, status, size = 'md' }: Props) {
	const s = sizes[size];
	const upcoming = status === 'not-open';
	const closed = status === 'closed';
	const full = status === 'open' && total > 0 && checkedIn >= total;
	const progress = upcoming || full || total === 0 ? 0 : Math.min(checkedIn / total, 1);
	return (
		<div className={`relative shrink-0 ${s.box}`}>
			<svg viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
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
					<span className={`font-display leading-tight tracking-normal ${s.count}`}>{upcoming ? total : checkedIn}</span>
					{!upcoming && <span className={`${s.total} ${closed ? '' : 'text-med-blue'}`}>/{total}</span>}
				</p>
				<p className={`leading-normal text-med-blue ${s.label}`}>{upcoming ? 'registered' : closed ? 'attended' : 'checked in'}</p>
			</div>
		</div>
	);
}
