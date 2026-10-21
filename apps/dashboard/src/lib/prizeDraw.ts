// Prize draw results per event in Firestore (events/{eventId}/draw/{ticket}), so a refresh or a
// second laptop doesn't lose a winner or draw them again (docs/migration-plan.md).
import { collection, doc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useEvent, type DashboardEvent } from './events';
import { db } from './firebase';
import { liveStore } from './live';

export interface DrawState {
	/** Attendee ids, in the order they won. */
	winners: string[];
	/** Drawn but not in the room: out for the night, not counted as winners. */
	notHere: string[];
	/** The next winner's number, counting everyone drawn so far. */
	next: number;
}

const EMPTY: DrawState = { winners: [], notHere: [], next: 1 };
const draw = (eventId: string) => collection(db, 'events', eventId, 'draw');

const store = liveStore<DrawState>((eventId, emit, fail) =>
	onSnapshot(
		draw(eventId),
		(snap) => {
			const drawn = snap.docs.map((d) => ({ id: d.id, result: d.get('result') as string, number: d.get('winnerNumber') as number }));
			drawn.sort((a, b) => a.number - b.number);
			emit({
				winners: drawn.filter((d) => d.result === 'won').map((d) => d.id),
				notHere: drawn.filter((d) => d.result === 'not-here').map((d) => d.id),
				next: Math.max(0, ...drawn.map((d) => d.number)) + 1,
			});
		},
		fail,
	),
);

export function useDraw(eventSlug: string) {
	return store.use(useEvent(eventSlug)?.id ?? null) ?? EMPTY;
}

/** Records a winner. Someone already drawn (on another laptop, say) can't be drawn again. */
export function addWinner(event: DashboardEvent, state: DrawState, attendeeId: string) {
	return setDoc(doc(draw(event.id), attendeeId), { result: 'won', drawnAt: serverTimestamp(), winnerNumber: state.next });
}

/** "Not here": takes the latest winner back off the list and keeps them out of the draw. */
export function markLatestNotHere(event: DashboardEvent, state: DrawState) {
	const latest = state.winners[state.winners.length - 1];
	if (!latest) return Promise.resolve();
	return updateDoc(doc(draw(event.id), latest), { result: 'not-here' });
}

/** Start over: everyone is back in the draw. */
export async function resetDraw(event: DashboardEvent) {
	const batch = writeBatch(db);
	for (const d of (await getDocs(draw(event.id))).docs) batch.delete(d.ref);
	await batch.commit();
}
