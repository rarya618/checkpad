// Firestore listeners shared by every component that reads the same data: one onSnapshot per
// key while anything reads it, kept a little after the last reader leaves, so moving between
// pages doesn't reload what's already showing.
import { useCallback, useSyncExternalStore } from 'react';

/** Starts listening for `key`; returns how to stop. */
type Start<T> = (key: string, emit: (value: T) => void, fail: (error: Error) => void) => () => void;

interface State<T> {
	value: T | undefined;
	error: Error | null;
}

interface Entry<T> {
	/** Replaced, never changed, so React sees each update */
	state: State<T>;
	listeners: Set<() => void>;
	stop?: () => void;
	idle?: ReturnType<typeof setTimeout>;
}

const KEEP_MS = 30_000;
const EMPTY: State<never> = { value: undefined, error: null };

export function liveStore<T>(start: Start<T>) {
	const entries = new Map<string, Entry<T>>();

	function subscribe(key: string, listener: () => void) {
		let entry = entries.get(key);
		if (!entry) entries.set(key, (entry = { state: { value: undefined, error: null }, listeners: new Set() }));
		const e = entry;
		clearTimeout(e.idle);
		e.listeners.add(listener);
		const notify = () => e.listeners.forEach((l) => l());
		e.stop ??= start(
			key,
			(value) => {
				e.state = { value, error: null };
				notify();
			},
			(error) => {
				e.state = { value: e.state.value, error };
				notify();
			},
		);
		return () => {
			e.listeners.delete(listener);
			if (e.listeners.size) return;
			e.idle = setTimeout(() => {
				e.stop?.();
				entries.delete(key);
			}, KEEP_MS);
		};
	}

	/** The latest value and error for `key`, for a part of a page that shows its own error. */
	function useResult(key: string | null): State<T> {
		const sub = useCallback((listener: () => void) => (key ? subscribe(key, listener) : () => {}), [key]);
		return useSyncExternalStore(sub, () => (key ? entries.get(key)?.state : undefined)) ?? EMPTY;
	}

	/**
	 * The latest value for `key`, or undefined while it loads (or when `key` is null). A
	 * listener that fails throws here, for the nearest error boundary.
	 */
	function use(key: string | null): T | undefined {
		const state = useResult(key);
		if (state.error) throw state.error;
		return state.value;
	}

	/** The latest value for `key` outside React, if something is reading it. */
	function peek(key: string): T | undefined {
		return entries.get(key)?.state.value;
	}

	return { use, useResult, peek };
}
