// The site's public pages, for search engines and agents. Check-in and team links are left out:
// they're per event, and noindex.
import type { APIRoute } from 'astro';
import { PAGES } from '../lib/docs';
import { SITE } from '../lib/markdown';

const paths = ['/', '/docs', ...PAGES.map((p) => `/docs/${p.slug}`), '/help', '/changelog', '/privacy'];

export const GET: APIRoute = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `\t<url><loc>${SITE}${path}</loc></url>`).join('\n')}
</urlset>
`,
		{ headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
	);
