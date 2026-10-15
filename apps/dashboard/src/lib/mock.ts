// Mock dashboard data until there's a backend.
import type { CheckpadEvent } from '@checkpad/shared/events';
import { mockEvents } from '@checkpad/shared/mock-events';

export interface EventSummary {
	event: CheckpadEvent;
	checkedIn: number;
	total: number;
}

const counts: Record<string, { checkedIn: number; total: number }> = {
	'gdg-september-meetup': { checkedIn: 41, total: 109 },
	'checkpad-demo': { checkedIn: 3, total: 24 },
	'gdg-future-meetup': { checkedIn: 0, total: 56 },
};

export const eventSummaries: EventSummary[] = mockEvents
	.map((event) => ({ event, ...(counts[event.slug] ?? { checkedIn: 0, total: 0 }) }))
	.sort((a, b) => b.event.startsAt.localeCompare(a.event.startsAt));

export const currentUser = { name: 'Russal Arya', role: 'Super admin' };
