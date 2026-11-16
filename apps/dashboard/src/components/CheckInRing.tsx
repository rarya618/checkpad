import type { CheckInStatus } from '@checkpad/shared/events';
import { useState } from 'react';

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
	const progress = upcoming || total === 0 ? 0 : full ? 1 : Math.min(checkedIn / total, 1);
	const count = upcoming ? total : checkedIn;
	// The count rolls only once it changes, not when the Events page first draws the cards
	const [shown, setShown] = useState(count);
	const [changed, setChanged] = useState(false);
	if (count !== shown) {
		setShown(count);
		setChanged(true);
	}
	return (
		// Hidden from screen readers: the card's link describes itself with the same count
		<div aria-hidden="true" className={`relative shrink-0 tabular-nums ${s.box}`}>
			<svg viewBox={`0 0 ${SIZE} ${SIZE}`} fill="none" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
				<circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={full ? 'var(--color-dark-blue)' : 'var(--color-light-blue)'} strokeWidth={STROKE} />
				{/* Always drawn, so a check-in sweeps it on from where it was (index.css): out from
				    nothing on the first, and closed round into a full ring on the last. Hidden while
				    empty, where its round cap would show a dot. */}
				<circle
					data-ring-arc
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={RADIUS}
					stroke={closed ? 'var(--color-med-blue)' : 'var(--color-dark-blue)'}
					strokeWidth={STROKE}
					strokeLinecap="round"
					strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
					opacity={progress > 0 ? 1 : 0}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center text-center whitespace-nowrap">
				<p className={`flex items-baseline gap-px ${closed ? 'text-med-blue' : 'text-dark-blue'}`}>
					{/* A new count rolls up into place, clipped to its line (index.css) */}
					<span className={`inline-grid overflow-hidden font-display leading-tight tracking-normal ${s.count}`}>
						<span key={count} data-ring-count={changed || undefined}>
							{count}
						</span>
					</span>
					{!upcoming && <span className={`${s.total} ${closed ? '' : 'text-med-blue'}`}>/{total}</span>}
				</p>
				<p className={`leading-normal text-med-blue ${s.label}`}>{upcoming ? 'registered' : closed ? 'attended' : 'checked in'}</p>
			</div>
		</div>
	);
}
