import type { ReactNode } from 'react';

interface Props {
	title: string;
	actions?: ReactNode;
	/** Sits right after the title, e.g. an "Unsaved changes" pill. */
	titleAddon?: ReactNode;
	/** h1 for a page title, h2 for a section inside a page. */
	level?: 1 | 2;
	/**
	 * Spacing and stick point. The space above the title lives inside the header so
	 * it can scroll away; the header sticks once 24px remains (the sidebar's gap).
	 * Defaults to a page header: 51px above, sticks after 27px of scroll.
	 */
	className?: string;
}

export default function PageHeader({ title, actions, titleAddon, level = 1, className = 'top-[-27px] pt-[51px] pb-[21px]' }: Props) {
	const Heading = level === 1 ? 'h1' : 'h2';
	return (
		<header className={`sticky z-10 bg-off-white px-6 ${className}`}>
			<div className="flex items-center justify-between gap-4 py-0.5">
				<div className="flex min-w-0 items-center gap-3">
					<Heading className="font-display text-3xl">{title}</Heading>
					{titleAddon}
				</div>
				{actions}
			</div>
		</header>
	);
}
