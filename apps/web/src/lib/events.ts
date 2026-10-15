import type { CheckpadEvent } from '@checkpad/shared/events';

// Placeholder until there's a backend. The first mirrors the event in the Figma
// dashboards (now finished); the others exist so every check-in state has a URL.
export const events: CheckpadEvent[] = [
	{
		slug: 'gdg-september-meetup',
		name: 'September Meetup',
		description: 'Join us for our monthly meetup',
		startsAt: '2026-09-10T17:00:00+10:00',
		endsAt: '2026-09-10T20:00:00+10:00',
		timeZone: 'Australia/Sydney',
	},
	{
		slug: 'checkpad-demo',
		name: 'Checkpad Demo',
		description: 'Try out the check-in flow',
		startsAt: '2026-01-01T00:00:00+10:00',
		endsAt: '2030-01-01T00:00:00+10:00',
		timeZone: 'Australia/Sydney',
	},
	{
		slug: 'gdg-future-meetup',
		name: 'Future Meetup',
		description: 'Join us for our monthly meetup',
		startsAt: '2030-03-14T17:00:00+11:00',
		endsAt: '2030-03-14T20:00:00+11:00',
		timeZone: 'Australia/Sydney',
	},
];
