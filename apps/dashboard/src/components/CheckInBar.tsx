import type { CSSProperties } from 'react';
import type { RosterStats } from '../lib/roster';

/**
 * Who's in, out of everyone on the list: pre-registered arrivals in navy, then walk-ins in
 * mid blue, on a light-blue track for everyone still to come. The one progress mark on the
 * dashboard (the Attendees stats card and the Events page). Segments slide to a new count
 * (index.css). Hidden from screen readers: whatever it sits beside says the same in words.
 */
export default function CheckInBar({ stats, size = 'md' }: { stats: Pick<RosterStats, 'preRegistered' | 'walkIns' | 'total'>; size?: 'md' | 'sm' }) {
	// Widths go through --segment, not an inline width, so index.css can start a new segment at 0
	const width = (n: number) => ({ '--segment': `${stats.total ? Math.min((n / stats.total) * 100, 100) : 0}%` }) as CSSProperties;
	return (
		<div aria-hidden="true" className={`flex gap-px overflow-hidden rounded-full bg-off-white ${size === 'md' ? 'h-2' : 'h-1.5'}`}>
			{stats.preRegistered > 0 && <div data-progress-segment className="bg-dark-blue" style={width(stats.preRegistered)} />}
			{stats.walkIns > 0 && <div data-progress-segment className="bg-med-blue" style={width(stats.walkIns)} />}
			<div className="flex-1 bg-light-blue" />
		</div>
	);
}
