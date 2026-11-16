import { useState } from 'react';

/**
 * A live count that rolls up into place when it changes (index.css), clipped to its line, so a
 * glance catches the change. It doesn't roll when the page first draws, only on a change after.
 * Tabular figures keep a 9 turning into 10 from shifting what's beside it.
 */
export default function RollingCount({ value, className = '' }: { value: number; className?: string }) {
	const [shown, setShown] = useState(value);
	const [changed, setChanged] = useState(false);
	if (value !== shown) {
		setShown(value);
		setChanged(true);
	}
	return (
		<span className={`inline-grid overflow-hidden tabular-nums ${className}`}>
			<span key={value} data-count-roll={changed || undefined}>
				{value}
			</span>
		</span>
	);
}
