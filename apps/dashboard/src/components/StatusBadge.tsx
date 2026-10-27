// Figma "Status badge": whether self check-in is open. "md" is full size on phones and the
// desktop's 75% scale from md up; "lg" is full size everywhere. Like every Figma badge, no
// letter spacing, though the rest of the bold text is tightened.
export default function StatusBadge({ open, size = 'md' }: { open: boolean; size?: 'md' | 'lg' }) {
	const lg = size === 'lg';
	return (
		<span
			className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-3.5 text-base leading-[1.5] font-bold tracking-normal ${
				lg ? '' : 'md:gap-1.5 md:py-[4.5px] md:pr-3 md:pl-[10.5px] md:text-xs'
			} ${open ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'}`}
		>
			<span aria-hidden="true" className={`size-2 rounded-full ${lg ? '' : 'md:size-1.5'} ${open ? 'bg-white' : 'bg-med-blue'}`} />
			{open ? 'Open' : 'Closed'}
		</span>
	);
}
