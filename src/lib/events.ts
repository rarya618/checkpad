export interface CheckpadEvent {
	slug: string;
	name: string;
	description: string;
}

// Placeholder until there's a backend; mirrors the event in the Figma dashboards.
export const events: CheckpadEvent[] = [
	{
		slug: 'gdg-september-meetup',
		name: 'September Meetup',
		description: 'Join us for our monthly meetup',
	},
];
