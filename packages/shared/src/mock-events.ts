import type { CheckpadEvent, Team } from './events';

export const mockTeams: Team[] = [{ slug: 'gdg-sydney', name: 'GDG Sydney' }];

// Sample data shared by both apps until there's a backend. The first mirrors the
// event in the Figma dashboards (now finished); the others exist so every
// check-in state can be seen.
export const mockEvents: CheckpadEvent[] = [
	{
		slug: 'gdg-september-meetup',
		name: 'September Meetup',
		description: 'Join us for our monthly meetup',
		startsAt: '2026-09-10T17:00:00+10:00',
		endsAt: '2026-09-10T20:00:00+10:00',
		timeZone: 'Australia/Sydney',
		teamSlug: 'gdg-sydney',
		selfWalkIns: true,
		selfCheckInOpen: false,
	},
	{
		slug: 'checkpad-demo',
		name: 'Checkpad Demo',
		description: 'Try out the check-in flow',
		startsAt: '2026-01-01T00:00:00+10:00',
		endsAt: '2030-01-01T00:00:00+10:00',
		timeZone: 'Australia/Sydney',
		selfWalkIns: true,
		selfCheckInOpen: true,
	},
	{
		slug: 'checkpad-demo-registered-only',
		name: 'Checkpad Demo (no walk-ins)',
		description: 'Try check-in with self-serve walk-ins off',
		startsAt: '2026-01-01T00:00:00+10:00',
		endsAt: '2030-01-01T00:00:00+10:00',
		timeZone: 'Australia/Sydney',
		selfWalkIns: false,
		selfCheckInOpen: true,
	},
	{
		slug: 'gdg-future-meetup',
		name: 'Future Meetup',
		description: 'Join us for our monthly meetup',
		startsAt: '2030-03-14T17:00:00+11:00',
		endsAt: '2030-03-14T20:00:00+11:00',
		timeZone: 'Australia/Sydney',
		teamSlug: 'gdg-sydney',
		selfWalkIns: true,
		selfCheckInOpen: false,
	},
];
