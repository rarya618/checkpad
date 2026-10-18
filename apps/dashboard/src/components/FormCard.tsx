import type { ReactNode } from 'react';

// The white bordered cards on New event and Event settings, at 75% scale.
interface Props {
	title: string;
	description?: string;
	/** Sits at the end of the title row, e.g. a status badge. */
	badge?: ReactNode;
	/** h2 directly under the page title (New event), h3 under a section heading (Event settings). */
	level?: 2 | 3;
	className?: string;
	children: ReactNode;
}

export default function FormCard({ title, description, badge, level = 2, className = '', children }: Props) {
	const Heading = level === 2 ? 'h2' : 'h3';
	return (
		<section className={`flex flex-col gap-[15px] rounded-xl border border-med-blue bg-white px-6 py-[21px] ${className}`}>
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center gap-[9px]">
					<Heading className="min-w-0 flex-1 font-display text-[21px] leading-[1.2]">{title}</Heading>
					{badge}
				</div>
				{description && <p className="text-[13.5px] leading-[1.5] text-med-blue">{description}</p>}
			</div>
			{children}
		</section>
	);
}
