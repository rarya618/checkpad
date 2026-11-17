import { useEffect, useLayoutEffect, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';

// Moving between two pages as one view transition (index.css says what moves), for links
// where the pages share something worth following: Events and New event share their primary
// button, an event's name travels between its row on Events and its page's title, and an
// event's own pages (Attendees, Check in, Analytics, Settings) keep its details in place while
// the page under them changes. Also for the move to an event once it's created. The router's own `viewTransition` option
// doesn't reach it from routes declared with <Routes>, so the link starts the transition
// itself and the page it goes to says when it has rendered. The old page waits a moment for
// that; a page that takes longer fades in by itself when it arrives.

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
/** The transition went ahead without the new page, which fades in by itself when it arrives. */
let late = false;
/** A page that asks before it's left (Event settings with unsaved changes): no transition. */
let guarded = false;

/** How long the old page waits for the new one before the transition goes ahead without it. */
const WAIT_MS = 150;

/** Goes to a page inside a view transition, where the browser has them: for after a save. */
export function useTransitionNavigate() {
	const navigate = useNavigate();
	return (to: string, shared?: Shared) => {
		if (!document.startViewTransition || guarded) return void navigate(to);
		late = false;
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
						clearTimeout(waiting);
						const target = arriving?.arriveAt ? document.querySelector<HTMLElement>(arriving.arriveAt) : null;
						if (target && arriving && inView(target)) {
							target.style.viewTransitionName = arriving.name;
							named.push(target);
						}
						arriving = null;
						resolve();
					};
					navigate(to);
					// Never hold the page long for one that's still loading
					const waiting = setTimeout(() => {
						late = arrived !== null;
						resolve();
					}, WAIT_MS);
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

/** For a list of links: makes each one's onClick, which goes to `to` inside a view transition. `shared` is worked out at the click. */
export function useTransitionLinks() {
	const go = useTransitionNavigate();
	return (to: string, shared?: (link: HTMLAnchorElement) => Shared | undefined) => (e: MouseEvent<HTMLAnchorElement>) => {
		// A new tab or window, or a browser without view transitions: the link works as usual
		if (!document.startViewTransition || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		go(to, shared?.(e.currentTarget));
	};
}

/** A link's onClick: goes to `to` inside a view transition. */
export function useTransitionLink(to: string, shared?: (link: HTMLAnchorElement) => Shared | undefined) {
	return useTransitionLinks()(to, shared);
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
		if (late) {
			// The transition has been and gone, to a loading page: fade in, as it would have
			late = false;
			arrived = null;
			arriving = null;
			document.querySelector('main')?.animate({ opacity: [0, 1] }, { duration: 160, easing: 'ease-out' });
			return;
		}
		arrived?.();
		arrived = null;
	}, []);
}

/** Called by a page that asks before it's left: while `on`, links from it skip the transition. */
export function useLeaveGuard(on: boolean) {
	useEffect(() => {
		guarded = on;
		return () => {
			guarded = false;
		};
	}, [on]);
}
