// Each docs page as Markdown (/docs/<slug>.md), for agents and LLMs. The HTML page links it.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getImage } from 'astro:assets';
import { PAGES, type DocsPage } from '../../lib/docs';
import { docsPageMarkdown, markdownResponse } from '../../lib/markdown';

export const getStaticPaths = (() => PAGES.map((page) => ({ params: { slug: page.slug }, props: { page } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ page: DocsPage }> = async ({ props: { page } }) => {
	const image = page.image && (await getImage({ src: page.image.src, width: 1440 })).src;
	return markdownResponse(docsPageMarkdown(page, { image }));
};
