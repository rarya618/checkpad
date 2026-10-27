import type { ReactNode } from 'react';

// Figma "Empty state" (Events – empty, Attendees – empty, Attendees – no search results),
// at 75% scale.
export default function EmptyState({
	icon,
	title,
	description,
	actions,
	compact = false,
}: {
	icon: string;
	title: string;
	description: string;
	actions: ReactNode;
	/** Less padding when it replaces a table under other content (no search results). */
	compact?: boolean;
}) {
	return (
		<section className={`flex flex-col items-center gap-[18px] rounded-xl border border-med-blue bg-white px-6 text-center md:px-9 ${compact ? 'py-9' : 'py-[54px]'}`}>
			<span className="flex size-[66px] items-center justify-center rounded-full bg-light-blue">
				<img src={icon} alt="" width={30} height={30} />
			</span>
			<div className="flex max-w-[420px] flex-col gap-1.5">
				<h2 className="font-display text-2xl leading-[1.2] break-words">{title}</h2>
				<p className="text-[15px] leading-[1.5] text-med-blue">{description}</p>
			</div>
			{/* Buttons keep their labels on one line, and wrap onto a second row on phones if they must */}
			<div className="flex flex-wrap justify-center gap-3 *:whitespace-nowrap">{actions}</div>
		</section>
	);
}
