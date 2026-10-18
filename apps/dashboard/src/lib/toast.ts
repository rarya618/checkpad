// One toast at a time, shown by <Toaster> at the bottom of the content column.
// Figma "Toast": a short confirmation that stays for about 5 seconds.
import { useSyncExternalStore } from 'react';

export interface Toast {
	id: number;
	message: string;
}

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 1;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function set(toast: Toast | null) {
	current = toast;
	listeners.forEach((listener) => listener());
}

export function showToast(message: string) {
	clearTimeout(timer);
	set({ id: nextId++, message });
	timer = setTimeout(() => set(null), 5000);
}

export function useToast() {
	return useSyncExternalStore(subscribe, () => current);
}
