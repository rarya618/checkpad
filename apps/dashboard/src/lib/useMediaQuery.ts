import { useSyncExternalStore } from 'react';

/** Whether a media query matches, kept in sync as the window resizes. */
export function useMediaQuery(query: string) {
	return useSyncExternalStore(
		(onChange) => {
			const list = matchMedia(query);
			list.addEventListener('change', onChange);
			return () => list.removeEventListener('change', onChange);
		},
		() => matchMedia(query).matches,
	);
}

/** Phones get the full-size mobile designs; from 768px the dashboard uses the desktop ones at 75%. */
export function useIsDesktop() {
	return useMediaQuery('(min-width: 768px)');
}
