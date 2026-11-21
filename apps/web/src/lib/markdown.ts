// The site's words as Markdown, for agents and LLMs: each docs page (docs/<slug>.md), attendee
// help (help.md), and the indexes that link them (llms.txt, llms-full.txt). Built from the same
// content as the HTML pages, so the two can't drift apart.
import type { Block, DocsPage } from './docs';
import type { HelpBlock } from './help';

export const SITE = 'https://checkpad.app';

/** Keeps placeholders like checkpad.app/<link> from reading as HTML tags. */
const escape = (text: string) => text.replace(/</g, '\\<');

const cell = (text: string) => escape(text).replace(/\|/g, '\\|');

function block(b: Block | HelpBlock, depth: number): string {
	if (typeof b === 'string') return escape(b);
	if ('heading' in b) return `${'#'.repeat(depth + 1)} ${escape(b.heading)}`;
	if ('steps' in b) return b.steps.map((step, n) => `${n + 1}. ${escape(step)}`).join('\n');
	if ('list' in b) return b.list.map((item) => `- ${escape(item)}`).join('\n');
	if ('table' in b) {
		const { head, rows } = b.table;
		return [head, head.map(() => '---'), ...rows].map((row) => `| ${row.map(cell).join(' | ')} |`).join('\n');
	}
	return `> **Tip:** ${escape(b.tip)}`;
}

/**
 * One docs page. `depth` is its title's heading level, so the pages can nest under one title
 * in llms-full.txt. `image` is the screenshot's built URL, shown after the first paragraph as
 * on the HTML page.
 */
export function docsPageMarkdown(page: DocsPage, { depth = 1, image }: { depth?: number; image?: string } = {}): string {
	const parts = [`${'#'.repeat(depth)} ${page.title}`, `> ${escape(page.description)}`];
	page.body.forEach((b, i) => {
		parts.push(block(b, depth));
		if (i === 0 && page.image && image) parts.push(`![${page.image.alt}](${new URL(image, SITE)})`);
	});
	return parts.join('\n\n') + '\n';
}

export function helpMarkdown(sections: { title: string; body: HelpBlock[] }[], depth = 1): string {
	const parts = [
		`${'#'.repeat(depth)} Help checking in`,
		`> For people checking in at an event. Organisers running one have the docs: ${SITE}/docs`,
	];
	for (const s of sections) parts.push(`${'#'.repeat(depth + 1)} ${escape(s.title)}`, ...s.body.map((b) => block(b, depth + 1)));
	return parts.join('\n\n') + '\n';
}

export const markdownResponse = (body: string, type = 'text/markdown') =>
	new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8` } });
