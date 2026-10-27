import type { ReactNode } from 'react';
import { useIsDesktop } from '../lib/useMediaQuery';

interface Props {
	title: string;
	actions?: ReactNode;
	/** Sits right after the title, e.g. an "Unsaved changes" pill. */
	titleAddon?: ReactNode;
	/** h1 for a page title, h2 for a section inside a page. */
	level?: 1 | 2;
	/**
	 * Desktop spacing and stick point. The space above the title lives inside the header so
	 * it can scroll away; the header sticks once 24px remains (the sidebar's gap).
	 * Defaults to a page header: 58px above, so the title lines up with the sidebar logo,
	 * and 15px below, like the event pages' headers.
	 */
	className?: string;
	/**
	 * Phones: the actions don't fit beside the title, so they get a row of their own that sticks
	 * while the title scrolls away (a search box, Save, filters), keeping the stuck part short.
	 */
	actionsRowOnPhones?: boolean;
}

export default function PageHeader({
	title,
	actions,
	titleAddon,
	level = 1,
	className = 'top-[-34px] pt-[58px] pb-[15px]',
	actionsRowOnPhones = false,
}: Props) {
	const Heading = level === 1 ? 'h1' : 'h2';
	const desktop = useIsDesktop();
	// Phones have no sidebar logo to line up with: a page title sits just below the top bar's
	// logo, and a section title 24px below what's above it.
	const above = level === 1 ? 'pt-3' : 'pt-6';
	if (!desktop && actionsRowOnPhones) {
		return (
			<>
				<header className={`px-6 ${above}`}>
					<div className="flex min-h-9 min-w-0 items-center gap-3">
						<Heading className="font-display text-2xl">{title}</Heading>
						{titleAddon}
					</div>
				</header>
				<div className="sticky top-0 z-10 bg-off-white px-6 pt-3 pb-[15px]">{actions}</div>
			</>
		);
	}
	// Otherwise actions that don't fit beside the title wrap onto a line of their own
	const spacing = desktop ? className : `top-0 pb-[15px] ${above}`;
	return (
		<header className={`sticky z-10 bg-off-white px-6 ${spacing}`}>
			{/* As tall as the sidebar logo (36px), which the title fills; taller buttons overhang it evenly */}
			<div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-3 md:h-9 md:flex-nowrap">
				<div className="flex min-w-0 items-center gap-3">
					<Heading className="font-display text-2xl md:text-3xl">{title}</Heading>
					{titleAddon}
				</div>
				{actions}
			</div>
		</header>
	);
}
