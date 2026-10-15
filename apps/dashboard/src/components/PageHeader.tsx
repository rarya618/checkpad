import type { ReactNode } from 'react';

interface Props {
	title: string;
	actions?: ReactNode;
}

// Sticks to the top of the scrolling content column after scrolling 27px, leaving
// a 24px gap above it to match the sidebar's. The page's top spacing lives inside
// the header so it can be scrolled away; the background hides content underneath.
export default function PageHeader({ title, actions }: Props) {
	return (
		<header className="sticky top-[-27px] z-10 bg-off-white px-6 pt-[51px] pb-[21px]">
			<div className="flex items-center justify-between py-0.5">
				<h1 className="font-display text-3xl">{title}</h1>
				{actions}
			</div>
		</header>
	);
}
