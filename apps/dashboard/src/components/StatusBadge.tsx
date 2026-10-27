// Figma "Status badge": whether self check-in is open. "md" is Figma's small pill size on
// phones (14px, as in "Organisers – manage team") and the desktop's 75% scale from md up; "lg"
// is full size everywhere. Like every Figma badge, no letter spacing, though the rest of the
// bold text is tightened.
export default function StatusBadge({ open, size = 'md' }: { open: boolean; size?: 'md' | 'lg' }) {
	const lg = size === 'lg';
	return (
		<span
			className={`flex shrink-0 items-center rounded-full leading-[1.5] font-bold tracking-normal ${
				lg ? 'gap-2 py-1.5 pr-4 pl-3.5 text-base' : 'gap-1.5 py-1 pr-3 pl-2.5 text-sm md:py-[4.5px] md:pl-[10.5px] md:text-xs'
			} ${open ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'}`}
		>
			<span aria-hidden="true" className={`rounded-full ${lg ? 'size-2' : 'size-1.5'} ${open ? 'bg-white' : 'bg-med-blue'}`} />
			{open ? 'Open' : 'Closed'}
		</span>
	);
}
