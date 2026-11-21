// Help for attendees (pages/help.astro, and help.md for agents), linked from the check-in page's
// footer. Keep it in the check-in page's own words (components/CheckInFlow.tsx), and update it
// when that flow changes. Organisers have the docs.
import { CONTACT_EMAIL } from './config';

/** A section's body: paragraphs, and bulleted lists. */
export type HelpBlock = string | { list: string[] };

export const HELP_SECTIONS: { id: string; title: string; body: HelpBlock[] }[] = [
	{
		id: 'checking-in',
		title: 'Checking in',
		body: [
			'Scan the QR code at the door with your phone’s camera, or type the event’s link, then enter the email address you registered with and choose Check in. You don’t need an account or an app.',
			'You’ll see “You’re checked in” with your name and, if you have one, your ticket number. If an organiser asks, show them that screen.',
		],
	},
	{
		id: 'not-on-the-list',
		title: '“You’re not on the list”',
		body: [
			'Checkpad looks you up by the email you registered with, so try any other address you might have used, such as a work one. Choose Try another email.',
			'Some events let you check in as a walk-in instead: you’ll be asked to add your name. If the event doesn’t, find one of the organisers and they’ll add you.',
		],
	},
	{
		id: 'other-messages',
		title: 'Other messages you might see',
		body: [
			{
				list: [
					'“Check-in opens at the event”: you’re early. Before the day, you can add the event to your calendar and come back to the link once you’re there. On the day, type your email while you wait and you’ll check in the moment it opens.',
					'“Check-in closed”: the organisers have closed check-in. If you’re still at the event, find one of them.',
					'“You’re already checked in”: you, or someone using your email, checked in earlier, at the time shown. Find an organiser if that wasn’t you.',
					'“Too many check-ins from this network”: lots of people on the venue’s Wi-Fi are checking in at once. Wait a few minutes or switch to mobile data, or find an organiser.',
					'“Something went wrong”: your phone lost its connection. Check it and try again.',
					'“Can’t load check-in”: the page couldn’t reach Checkpad. Check your connection and open the link again. If it still won’t load, an organiser can check you in.',
				],
			},
		],
	},
	{
		id: 'your-details',
		title: 'Your details',
		body: [
			'Checking in records that you arrived and when, for the event’s organisers. It doesn’t sign you up to anything or send you email. What Checkpad stores, and how to have it removed, is in the privacy policy.',
			`For anything about your registration or the event itself, ask its organisers. For anything about Checkpad, email ${CONTACT_EMAIL}.`,
		],
	},
];
