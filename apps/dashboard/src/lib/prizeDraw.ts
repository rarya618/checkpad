// Prize draw results per event, kept outside the page so leaving and coming back doesn't
// lose or redraw a winner (docs/migration-plan.md: saved per event). Firestore later.
import { useSyncExternalStore } from 'react';

export interface DrawState {
	/** Attendee ids, in the order they won. */
	winners: string[];
	/** Drawn but not in the room: out for the night, not counted as winners. */
	notHere: string[];
}

const EMPTY: DrawState = { winners: [], notHere: [] };
let draws: Record<string, DrawState> = {};
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function set(eventSlug: string, state: DrawState) {
	draws = { ...draws, [eventSlug]: state };
	listeners.forEach((listener) => listener());
}

export function useDraw(eventSlug: string) {
	return useSyncExternalStore(subscribe, () => draws[eventSlug] ?? EMPTY);
}

export function addWinner(eventSlug: string, attendeeId: string) {
	const s = draws[eventSlug] ?? EMPTY;
	set(eventSlug, { ...s, winners: [...s.winners, attendeeId] });
}

/** "Not here": takes the latest winner back off the list and keeps them out of the draw. */
export function markLatestNotHere(eventSlug: string) {
	const s = draws[eventSlug] ?? EMPTY;
	const latest = s.winners[s.winners.length - 1];
	if (!latest) return;
	set(eventSlug, { winners: s.winners.slice(0, -1), notHere: [...s.notHere, latest] });
}

export function resetDraw(eventSlug: string) {
	set(eventSlug, EMPTY);
}
