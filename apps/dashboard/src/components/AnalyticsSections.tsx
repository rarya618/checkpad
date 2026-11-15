import { useEffect, useRef, useState, type ReactNode } from 'react';

// The headed groups both Analytics pages are split into, and the rail of them down the right on
// wide windows. Not in Figma.

const sectionId = (title: string) => `analytics-${title.toLowerCase().replace(/\s+/g, '-')}`;

/**
 * A headed group of cards. The rule and the space above set it apart from the cards' own
 * titles; jumping to one from the rail leaves room for the sticky header (about 76px).
 */
export function Section({ title, level, children }: { title: string; level: 2 | 3; children: ReactNode }) {
	const Heading = `h${level}` as const;
	return (
		<section id={sectionId(title)} className="flex scroll-mt-24 flex-col gap-4 border-t border-light-blue pt-6">
			<Heading className="font-display text-2xl">{title}</Heading>
			{children}
		</section>
	);
}

/** The sections, in page order, sticking under the page's header. The one being read is marked; choosing one scrolls to it. */
export function SectionRail({ sections }: { sections: string[] }) {
	const [active, setActive] = useState(sections[0]);
	const nav = useRef<HTMLElement>(null);
	// While a jump scrolls, the section chosen stays marked, even if the page bottoms out first
	const jumping = useRef(false);
	const key = sections.join('|');

	useEffect(() => {
		// The desktop layout scrolls in <main>, not the window
		const scroller = nav.current?.closest('main');
		if (!scroller) return;
		const main = scroller;
		const list = key.split('|');
		function update() {
			if (jumping.current) return;
			// The last sections are too short to reach the top, so the bottom of the page marks the last
			if (main.scrollTop + main.clientHeight >= main.scrollHeight - 2) return setActive(list[list.length - 1]);
			// Otherwise the last section whose heading has passed under the sticky header
			const line = main.getBoundingClientRect().top + 100;
			setActive(list.filter((t) => (document.getElementById(sectionId(t))?.getBoundingClientRect().top ?? Infinity) <= line).pop() ?? list[0]);
		}
		function settled() {
			jumping.current = false;
		}
		update();
		main.addEventListener('scroll', update, { passive: true });
		main.addEventListener('scrollend', settled);
		// Browsers without scrollend: the wheel or keys mean the reader has taken over
		main.addEventListener('wheel', settled, { passive: true });
		main.addEventListener('keydown', settled);
		return () => {
			main.removeEventListener('scroll', update);
			main.removeEventListener('scrollend', settled);
			main.removeEventListener('wheel', settled);
			main.removeEventListener('keydown', settled);
		};
	}, [key]);

	function jump(title: string) {
		const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		jumping.current = true;
		setActive(title);
		document.getElementById(sectionId(title))?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
		// Nothing to scroll (already there) fires no scrollend, so let go after a moment regardless
		window.setTimeout(() => (jumping.current = false), 1500);
	}

	return (
		<nav ref={nav} aria-label="Analytics sections" className="sticky top-24 hidden w-40 shrink-0 xl:block">
			<ul className="flex flex-col border-l border-light-blue">
				{sections.map((t) => (
					<li key={t}>
						<a
							href={`#${sectionId(t)}`}
							aria-current={active === t ? 'true' : undefined}
							onClick={(e) => {
								e.preventDefault();
								jump(t);
							}}
							className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm leading-normal transition-colors ${
								active === t ? 'border-dark-blue font-bold text-dark-blue' : 'border-transparent text-med-blue hover:text-dark-blue'
							}`}
						>
							{t}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
