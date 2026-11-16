// Whether self check-in is open: a dot and a label, set inline with no pill round them, in navy
// alone. Open is a solid navy dot beside a semibold label; anything else is a faint hollow dot
// beside a lighter label, so the state reads from the dot's fill as well as its words. No
// letter spacing, unlike the rest of the semibold text. "md" sits in text rows and headings;
// "lg" is a step up. `label` replaces "Open"/"Closed" where the indicator stands on its own (the
// Events page says "Check-in open", "Not open yet" and so on).
export default function StatusBadge({ open, size = 'md', label }: { open: boolean; size?: 'md' | 'lg'; label?: string }) {
	const lg = size === 'lg';
	return (
		<span
			className={`status-indicator inline-flex shrink-0 items-center leading-normal tracking-normal whitespace-nowrap ${lg ? 'gap-2 text-base' : 'gap-1.5 text-sm'} ${
				open ? 'font-semibold text-dark-blue' : 'font-normal text-dark-blue/60'
			}`}
		>
			<span aria-hidden="true" className={`shrink-0 rounded-full ${lg ? 'size-2' : 'size-1.5'} ${open ? 'bg-dark-blue' : 'border border-dark-blue/40'}`} />
			{label ?? (open ? 'Open' : 'Closed')}
		</span>
	);
}
