// Figma "Status badge": whether self check-in is open. "md" is the desktop's 75% scale,
// "lg" full size for phones.
export default function StatusBadge({ open, size = 'md' }: { open: boolean; size?: 'md' | 'lg' }) {
	const lg = size === 'lg';
	return (
		<span
			className={`flex shrink-0 items-center rounded-full leading-[1.5] font-bold ${
				lg ? 'gap-2 py-1.5 pr-4 pl-3.5 text-base' : 'gap-1.5 py-[4.5px] pr-3 pl-[10.5px] text-xs'
			} ${open ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'}`}
		>
			<span aria-hidden="true" className={`rounded-full ${lg ? 'size-2' : 'size-1.5'} ${open ? 'bg-white' : 'bg-med-blue'}`} />
			{open ? 'Open' : 'Closed'}
		</span>
	);
}
