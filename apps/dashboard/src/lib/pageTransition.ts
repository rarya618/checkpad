import { useLayoutEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';

// Moving between two pages as one view transition (index.css says what moves), for links
// where the pages share something worth following: Events and New event share their primary
// button, and an event's name travels between its row on Events and its page's title. Also
// for the move to an event once it's created. The router's own `viewTransition` option
// doesn't reach it from routes declared with <Routes>, so the link starts the transition
// itself and the page it goes to says when it has rendered (a page loaded on first use takes a
// moment, and the old one stays up until then).

/**
 * Something that travels between the two pages under a view-transition-name. The page being
 * left names it on `from`; the page arrived at has an element with that name in its styles
 * already, or one found by `arriveAt` (a selector), which only takes the name if it's in view.
 */
export interface Shared {
	name: string;
	from?: HTMLElement | null;
	arriveAt?: string;
}

let arrived: (() => void) | null = null;
let arriving: Shared | null = null;

/** Goes to a page inside a view transition, where the browser has them: for after a save. */
export function useTransitionNavigate() {
	const navigate = useNavigate();
	return (to: string, shared?: Shared) => {
		if (!document.startViewTransition) return void navigate(to);
		const named: HTMLElement[] = [];
		arriving = shared?.arriveAt ? shared : null;
		if (shared?.from) {
			shared.from.style.viewTransitionName = shared.name;
			named.push(shared.from);
		}
		const transition = document.startViewTransition(
			() =>
				new Promise<void>((resolve) => {
					arrived = () => {
						const target = arriving?.arriveAt ? document.querySelector<HTMLElement>(arriving.arriveAt) : null;
						if (target && arriving && inView(target)) {
							target.style.viewTransitionName = arriving.name;
							named.push(target);
						}
						arriving = null;
						resolve();
					};
					navigate(to);
					// Never hold the page for a render that doesn't come
					setTimeout(resolve, 400);
				}),
		);
		// The names are only for this move: two elements with one name would stop the next
		transition.finished.finally(() => {
			for (const el of named) el.style.viewTransitionName = '';
		});
	};
}

function inView(el: HTMLElement) {
	const box = el.getBoundingClientRect();
	return box.height > 0 && box.bottom > 0 && box.top < innerHeight && el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
}

/** A link's onClick: goes to `to` inside a view transition. `shared` is worked out at the click. */
export function useTransitionLink(to: string, shared?: (link: HTMLAnchorElement) => Shared | undefined) {
	const go = useTransitionNavigate();
	return (e: MouseEvent<HTMLAnchorElement>) => {
		// A new tab or window, or a browser without view transitions: the link works as usual
		if (!document.startViewTransition || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		go(to, shared?.(e.currentTarget));
	};
}

/** Opening an event from its row or card: the name, in the heading around the link, becomes the page's title. */
export const eventNameOut = (link: HTMLAnchorElement): Shared => ({ name: 'event-title', from: link.closest<HTMLElement>('[data-event-name]') });

/** Back to Events from an event's page: its title returns to the event's row or card, when that's in view. */
export function eventNameBack(): Shared | undefined {
	const slug = /^\/events\/([^/]+)/.exec(location.pathname)?.[1];
	return slug ? { name: 'event-title', arriveAt: `[data-event-name="${CSS.escape(slug)}"]` } : undefined;
}

/** Called by a page that such a link goes to: tells the waiting transition it's on screen. */
export function usePageArrival() {
	useLayoutEffect(() => {
		arrived?.();
		arrived = null;
	}, []);
}
