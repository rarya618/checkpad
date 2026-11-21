// Every docs page and the attendee help in one Markdown file, for agents and LLMs that read a
// site in one go. llms.txt links it.
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { PAGES } from '../lib/docs';
import { HELP_SECTIONS } from '../lib/help';
import { docsPageMarkdown, helpMarkdown, markdownResponse, SITE } from '../lib/markdown';

export const GET: APIRoute = async () => {
	const pages = await Promise.all(
		PAGES.map(async (page) => {
			const image = page.image && (await getImage({ src: page.image.src, width: 1440 })).src;
			return docsPageMarkdown(page, { depth: 2, image });
		}),
	);
	return markdownResponse(
		[
			`# Checkpad docs\n\n> How to run check-in with Checkpad, for organisers (${SITE}/docs), then help for attendees checking in (${SITE}/help).`,
			...pages,
			helpMarkdown(HELP_SECTIONS, 2),
		].join('\n\n'),
		'text/plain',
	);
};
