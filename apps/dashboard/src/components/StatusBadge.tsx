// Figma "Status badge": whether self check-in is open, at 75% scale.
export default function StatusBadge({ open }: { open: boolean }) {
	return (
		<span
			className={`flex shrink-0 items-center gap-1.5 rounded-full py-[4.5px] pr-3 pl-[10.5px] text-xs leading-[1.5] font-bold ${
				open ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'
			}`}
		>
			<span aria-hidden="true" className={`size-1.5 rounded-full ${open ? 'bg-white' : 'bg-med-blue'}`} />
			{open ? 'Open' : 'Closed'}
		</span>
	);
}
