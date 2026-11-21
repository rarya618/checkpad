// The site's map for agents and LLMs (llmstxt.org): what Checkpad is, and each page's Markdown copy.
import type { APIRoute } from 'astro';
import { CONTACT_EMAIL } from '../lib/config';
import { GROUPS, PAGES } from '../lib/docs';
import { markdownResponse, SITE } from '../lib/markdown';

const docs = GROUPS.map(
	(group) => `## Docs: ${group}\n\n` + PAGES.filter((p) => p.group === group).map((p) => `- [${p.title}](${SITE}/docs/${p.slug}.md): ${p.description}`).join('\n'),
).join('\n\n');

export const GET: APIRoute = () =>
	markdownResponse(
		`# Checkpad

> Self check-in for community meetups. Organisers import their attendee list from Bevy, Luma or Humanitix and put a QR code at the door; attendees scan it and type the email they registered with to check in, with no app or account. Organisers watch arrivals and add walk-ins on a dashboard, then see analytics and export attendance.

- The organiser dashboard is at https://manage.checkpad.app. Checkpad isn't open to new organisers yet: they join the waitlist at ${SITE}/#waitlist, or are invited by someone already on it.
- Each event has a check-in link, ${SITE}/<event-link>, and each team a permanent one, ${SITE}/team/<team-link>. These are for attendees at the event; agents shouldn't check people in on their behalf.
- Questions about Checkpad: ${CONTACT_EMAIL}. Questions about a particular event go to its organisers.
- Everything below, in one file: ${SITE}/llms-full.txt

${docs}

## Attendees

- [Help checking in](${SITE}/help.md): How to check in at an event, and what each message on the check-in page means.

## Optional

- [Changelog](${SITE}/changelog.md): What's changed in each version, and who each change is for.
- [Privacy](${SITE}/privacy): What Checkpad stores about waitlist signups, attendees and organisers, and how to have it removed.
`,
		'text/plain',
	);
