// The organiser guide, one page per topic (pages/docs/index.astro and pages/docs/[slug].astro).
// Keep each step true to the dashboard's own wording (labels, buttons and menu items in
// apps/dashboard), and update it when a flow changes. The code is ahead of the Figma frames
// "Docs – desktop" and "Docs – mobile" until they're redrawn as a sidebar and topic pages.
import type { ImageMetadata } from 'astro';
import analytics from '../assets/docs/analytics.png';
import importAttendees from '../assets/docs/import.png';
import newEvent from '../assets/docs/new-event.png';
import organisers from '../assets/docs/organisers.png';
import prizeDraw from '../assets/docs/prize-draw.png';
import share from '../assets/docs/share.png';
import signIn from '../assets/docs/sign-in.png';
import staffCheckIn from '../assets/screens/staff-check-in.png';
import { CONTACT_EMAIL } from './config';

/** A page's body: paragraphs, subheadings, numbered steps, bulleted lists and tips. */
export type Block = string | { heading: string } | { steps: string[] } | { list: string[] } | { tip: string };

const sections: { id: string; title: string; body: Block[] }[] = [
	{
		id: 'getting-started',
		title: 'Getting started',
		body: [
			'Checkpad isn’t open to new organisers yet. Join the waitlist on the home page and we’ll email you when you can set up your first event.',
			'If someone already on Checkpad adds you as an organiser, you’ll get an invite by email. Its button opens the dashboard’s sign-in with your address filled in: sign in with Google or with a code we email you.',
			{ tip: 'If you were invited to start a new team, the dashboard asks you to name it and say where it meets the first time you sign in. New events start in that place’s time zone.' },
		],
	},
	{
		id: 'signing-in',
		title: 'Signing in',
		body: [
			'The dashboard is at manage.checkpad.app. Sign in with the email address you were invited with, in one of two ways:',
			{
				list: [
					'Sign in with Google, if that address is a Google account.',
					'An emailed code: enter the address and we’ll email you a 6-digit code. Type it on the sign-in page, on any device; it works once, for 10 minutes. The same email has a link too, which signs you in when you open it on the device and browser you asked from, within an hour.',
				],
			},
			'If something stops you:',
			{
				list: [
					'“You don’t have access yet”: the address you signed in with isn’t on the organiser list. Choose Use another account, or ask a super admin to add that address.',
					'“That code isn’t right, or it’s expired”: check you’re using the code from the newest email (asking again replaces the last code), and that it’s less than 10 minutes old. After five wrong tries a code stops working; send a new one.',
					'“This link has expired”: it was used already, is more than an hour old, or was opened on another device. Send yourself a new email from that page and use its code instead.',
					'No email after a few minutes: check your spam folder, then send it again. If it still doesn’t come, the address probably isn’t the one you were invited with.',
					'“This email signs in with an emailed code”: you’ve signed in by email with this address before, so Google sign-in won’t take it. Use an emailed code.',
				],
			},
			{ tip: 'Sign-in emails come from noreply@checkpad.app and their link starts with https://manage.checkpad.app/. Don’t use a link that goes anywhere else, and only type the code on manage.checkpad.app. Nobody from Checkpad will ask you for it.' },
		],
	},
	{
		id: 'teams-and-roles',
		title: 'Teams and roles',
		body: [
			'Events belong to teams. Everyone on a team sees and runs its events. There are three roles:',
			{
				list: [
					'Organiser: creates and edits their team’s events and imports attendees.',
					'Team member: checks people in at their team’s events, without changing the event.',
					'Super admin: sees every event and team, and manages organisers and teams.',
				],
			},
			'Super admins add people from Organisers: Add organiser on the People tab, or Manage on a team in the Teams tab. They’re emailed an invite and can sign in straight away. Organisers and team members can see who’s on their team there.',
			'Each team has a permanent team link, like checkpad.app/team/tech-meetup. It opens the team’s event that is open for check-in, or else its next upcoming event, so you can print it on signs once and reuse them every month.',
			{ tip: 'Changing a team’s link name breaks signs that use the old link.' },
		],
	},
	{
		id: 'create-an-event',
		title: 'Create an event',
		body: [
			{
				steps: [
					'On Events, choose New event.',
					'Give it a name and a link. Attendees check in at checkpad.app/<link>, so keep it short.',
					'Set the date, start and end times and the time zone.',
					'Choose the teams that run it. The team that creates the event owns it: only its organisers can change the teams or delete the event.',
					'Under Walk-ins, set the ticket title and venue walk-ins get, and choose whether attendees can add themselves.',
					'Choose Create event.',
				],
			},
			'You can change all of this later in the event’s Settings. The link is locked while check-in is open, so attendees’ QR codes keep working.',
		],
	},
	{
		id: 'import-attendees',
		title: 'Import attendees',
		body: [
			'Checkpad imports the attendee CSV from Bevy, Luma or Humanitix.',
			{
				list: [
					'Bevy: open the event’s attendee list and choose Export → CSV.',
					'Luma: download the guest list as a CSV from the event’s Guests tab.',
					'Humanitix: download the event’s attendee report as a CSV.',
				],
			},
			'In the dashboard, open the event, choose the options menu, then Import attendees, and pick the file. Before anything is saved you’ll see how many people are new, updated, unchanged or skipped, and why any rows were skipped.',
			'People are matched by ticket number (guest ID in Luma), so you can import the same list again as more people register. Nobody is added twice, and anyone already checked in stays checked in.',
			{ tip: 'The file needs columns for first name, email and a ticket number or guest ID. Upload it as a CSV, not an Excel file.' },
		],
	},
	{
		id: 'import-reference',
		title: 'What an import reads',
		body: [
			'Checkpad reads these columns from a Bevy, Luma or Humanitix export, by their headers:',
			{
				list: [
					'First name and last name. If the file has a single name column instead, the last word becomes the last name.',
					'Email.',
					'Ticket number (Bevy), guest ID (Luma), or order ID and ticket number (Humanitix, read together as ABC12345-2). This is how people are matched when you import again.',
					'Ticket type (Bevy’s ticket title, Luma’s ticket name, Humanitix’s ticket type), shown in the attendee list and in Analytics.',
					'When they registered, for Analytics’ Registrations section: when people signed up, day by day, and which of them came.',
					'Status (Luma’s approval status, Humanitix’s status). Only people who are going are imported.',
				],
			},
			'Any other column is treated as one of your registration questions, and its answers are kept with each person and included in Export attendance. Up to 50 questions are kept. Columns the platforms add themselves, like phone numbers, payments and ad tracking, are left out.',
			'Rows are skipped, with the reason and the row numbers shown before you import, when they:',
			{
				list: [
					'are on the waitlist, waiting for approval, declined, invited but not registered, not going, cancelled or refunded',
					'have no email address, or one that isn’t valid',
					'have no first name or no ticket number',
					'repeat a ticket number or email from an earlier row',
					'have an email that’s already on the list with another ticket',
				],
			},
			'Importing again adds new people and updates the names, ticket types, answers and registration dates of people already on the list. It doesn’t change anyone’s email, check anyone in or out, or remove anyone: people who cancel after an import stay on the list.',
			{ tip: 'Walk-ins added by mistake can be removed from the attendee list: choose Remove walk-in from their row’s menu.' },
		],
	},
	{
		id: 'open-check-in',
		title: 'Open check-in',
		body: [
			'Attendees can only check themselves in while self check-in is open. Turn on Self check-in open in the event’s Settings when doors open, and turn it off when the night’s over. Staff can check people in from the dashboard either way.',
			'To put the QR code at the door, choose Share on the event. From there you can:',
			{
				list: [
					'copy the check-in link',
					'download the QR code as a PNG to print',
					'open the venue display, a full-screen page with the QR code for a TV or projector',
				],
			},
			'The venue display updates itself: it says “Check-in opens soon” before you open check-in and “Check-in has closed” after you close it.',
		],
	},
	{
		id: 'on-the-night',
		title: 'On the night',
		body: [
			'Attendees scan the QR code with their phone camera, or type the link, and enter the email they registered with. They see “You’re checked in” with their ticket number, and your dashboard updates straight away.',
			'If their email isn’t on the list, what happens depends on the event’s walk-in setting:',
			{
				list: [
					'If attendees can add themselves, they add their name and check in as a walk-in.',
					'If not, they’re asked to find an organiser.',
				],
			},
			'Staff check people in from Check in on a laptop or phone. Search by email or ticket number and choose Check in. If nobody matches, choose Add walk-in to add them with the next walk-in ticket, like CPWALKIN0001. Walk-in numbers never repeat, even when several people are checking in on different devices.',
			{ tip: 'Checked someone in by mistake? Choose Undo check-in next to their name, on the Check in page or in the attendee list.' },
		],
	},
	{
		id: 'when-something-goes-wrong',
		title: 'When something goes wrong',
		body: [
			{ heading: 'Someone says they registered but isn’t found' },
			'They may have registered with another email. Search for their name on the event’s Attendees page, which matches names, emails and ticket numbers, and choose Check in on their row. If they aren’t there, add them as a walk-in.',
			{ heading: 'The venue Wi-Fi drops' },
			'Check-ins on the dashboard still show straight away and save when the connection comes back, so keep checking people in. Adding a walk-in needs a connection, because it takes the next ticket number, so add walk-ins once you’re back online. Attendees checking in on their own phones need their mobile data or the Wi-Fi.',
			{ heading: 'Attendees see “Check-in closed”' },
			'Self check-in is off, or was turned off. Turn on Self check-in open in the event’s Settings, or check them in from the dashboard, which works either way.',
			{ heading: 'Attendees see “Too many check-ins from this network”' },
			'Everyone on the venue Wi-Fi shares one limit, which only very large events reach. Check people in from the dashboard, or ask them to use mobile data; the limit clears within ten minutes.',
			{ heading: 'An attendee shows “You’re already checked in”' },
			'They, or someone using their email, checked in earlier; the screen shows when. If that wasn’t them, check the Attendees page and undo the earlier check-in if it was a mistake.',
			{ tip: 'Before a big event, export the attendee list (Export attendance from the event’s options menu) so you have a copy if the venue has no connection at all.' },
		],
	},
	{
		id: 'prize-draw',
		title: 'Prize draw',
		body: [
			'Choose Open prize draw from the event’s options menu and put it on the projector. It draws from everyone who has checked in and shows names only.',
			'Nobody wins twice, even if the page is refreshed. If a winner isn’t in the room, mark them not here and draw again. To start over, every winner goes back into the draw, along with anyone marked not here.',
		],
	},
	{
		id: 'after-the-event',
		title: 'After the event',
		body: [
			'The event’s Analytics shows who came: arrivals every 15 minutes, turnout by ticket type, walk-ins, how early people arrived, first-timers and how people checked in. The Analytics page in the sidebar compares turnout across all your events.',
			'To report attendance back, use the event’s options menu:',
			{
				list: [
					'Export for Bevy: a CSV for Bevy’s bulk upload, with walk-ins included.',
					'Export attendance (CSV): who registered and who came, with their answers to the registration questions, for any other platform.',
				],
			},
			'Deleting an event deletes its attendee list.',
		],
	},
	{
		id: 'getting-help',
		title: 'Getting help',
		body: [
			`Email ${CONTACT_EMAIL}. So we can help quickly, include:`,
			{
				list: [
					'the event’s link, like checkpad.app/september-meetup',
					'what you were doing and what you saw, with the exact wording of any message',
					'the device and browser you were using',
				],
			},
			'What’s changed in each version of Checkpad is in the changelog at checkpad.app/changelog.',
			{ tip: 'Attendees with questions about their details for your event should ask you, as its organiser. Questions about what Checkpad itself stores can come to us.' },
		],
	},
];

// A screenshot for each page, shown after its first paragraph. They're exported from the
// "Website screenshots" section of the Checkpad Figma file (Screens page), named docs-*.png there.
const images: Record<string, { src: ImageMetadata; alt: string }> = {
	'getting-started': { src: signIn, alt: 'The dashboard’s sign-in page, asking “What’s your email?”, with Email me a code and continue with Google' },
	'teams-and-roles': { src: organisers, alt: 'The Organisers page listing people with their roles and teams' },
	'create-an-event': { src: newEvent, alt: 'The New event page with Details, When, Teams and Walk-ins' },
	'import-attendees': { src: importAttendees, alt: 'The Import attendees dialog showing new, updated and skipped rows before importing' },
	'open-check-in': { src: share, alt: 'The Share check-in dialog with the QR code, the check-in link and Open venue display' },
	'on-the-night': { src: staffCheckIn, alt: 'The staff Check in page offering to add an unregistered email as a walk-in' },
	'prize-draw': { src: prizeDraw, alt: 'The prize draw on the projector showing the third winner' },
	'after-the-event': { src: analytics, alt: 'Event analytics with arrivals, turnout by ticket type, arrival timing and first-timers' },
};

/** The sidebar's groups, in reading order: when an organiser needs each page. */
export const GROUPS = ['Set up', 'On the night', 'Afterwards', 'Help'] as const;

/** Each page's group, its title where the old section's doesn't fit a page of its own, and a line for the index. */
const meta: Record<string, { group: (typeof GROUPS)[number]; title?: string; slug?: string; description: string }> = {
	'getting-started': { group: 'Set up', description: 'How to get onto Checkpad, and what happens the first time you sign in.' },
	'signing-in': { group: 'Set up', description: 'Google or an emailed code, and what to do when sign-in stops you.' },
	'teams-and-roles': { group: 'Set up', description: 'Organisers, team members and super admins, and your team’s permanent link.' },
	'create-an-event': { group: 'Set up', description: 'Name, link, date, teams and walk-in settings.' },
	'import-attendees': { group: 'Set up', description: 'Bring in your attendee list from Bevy, Luma or Humanitix, and import again as people register.' },
	'import-reference': { group: 'Set up', description: 'Which columns are read, which rows are skipped, and what importing again changes.' },
	'open-check-in': { group: 'On the night', description: 'Open self check-in and put the QR code at the door.' },
	'on-the-night': { group: 'On the night', title: 'Checking people in', slug: 'checking-people-in', description: 'What attendees see, walk-ins, and checking people in from the dashboard.' },
	'when-something-goes-wrong': { group: 'On the night', description: 'People not on the list, the Wi-Fi dropping, and the messages attendees might see.' },
	'prize-draw': { group: 'On the night', description: 'Draw winners on the projector from everyone who checked in.' },
	'after-the-event': { group: 'Afterwards', title: 'Analytics and exports', slug: 'analytics-and-exports', description: 'See who came and report attendance back to Bevy or anywhere else.' },
	'getting-help': { group: 'Help', description: 'How to reach us, and what to include.' },
};

export interface DocsPage {
	slug: string;
	group: (typeof GROUPS)[number];
	title: string;
	description: string;
	body: Block[];
	image?: { src: ImageMetadata; alt: string };
}

/** Every page in reading order: by group, then as listed above. */
export const PAGES: DocsPage[] = GROUPS.flatMap((group) =>
	sections
		.filter((s) => meta[s.id].group === group)
		.map((s) => ({ slug: meta[s.id].slug ?? s.id, group, title: meta[s.id].title ?? s.title, description: meta[s.id].description, body: s.body, image: images[s.id] })),
);

/** The one-page guide's section anchors (/docs#on-the-night) → the page each became. */
export const OLD_ANCHORS: Record<string, string> = Object.fromEntries(Object.keys(meta).map((id) => [id, meta[id].slug ?? id]));
