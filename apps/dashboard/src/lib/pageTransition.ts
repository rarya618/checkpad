import { useLayoutEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';

// Moving between two pages as one view transition (index.css says what moves), for links
// where the pages share something worth following, like Events and New event, and for the
// move to an event once it's created. The router's
// own `viewTransition` option doesn't reach it from routes declared with <Routes>, so the
// link starts the transition itself and the page it goes to says when it has rendered (a page
// loaded on first use takes a moment, and the old one stays up until then).

let arrived: (() => void) | null = null;

/** Goes to a page inside a view transition, where the browser has them: for after a save. */
export function useTransitionNavigate() {
	const navigate = useNavigate();
	return (to: string) => {
		if (!document.startViewTransition) return void navigate(to);
		document.startViewTransition(
			() =>
				new Promise<void>((resolve) => {
					arrived = resolve;
					navigate(to);
					// Never hold the page for a render that doesn't come
					setTimeout(resolve, 400);
				}),
		);
	};
}

/** A link's onClick: goes to `to` inside a view transition. */
export function useTransitionLink(to: string) {
	const go = useTransitionNavigate();
	return (e: MouseEvent<HTMLAnchorElement>) => {
		// A new tab or window, or a browser without view transitions: the link works as usual
		if (!document.startViewTransition || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		go(to);
	};
}

/** Called by a page that such a link goes to: tells the waiting transition it's on screen. */
export function usePageArrival() {
	useLayoutEffect(() => {
		arrived?.();
		arrived = null;
	}, []);
}
