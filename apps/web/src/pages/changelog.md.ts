// The changelog as Markdown (/changelog.md), for agents and LLMs: CHANGELOG.md's releases,
// without the introduction that's for whoever releases.
import type { APIRoute } from 'astro';
import changelog from '../../../../CHANGELOG.md?raw';
import { markdownResponse } from '../lib/markdown';

const releases = changelog.slice(changelog.indexOf('\n## ') + 1);

export const GET: APIRoute = () =>
	markdownResponse(`# Checkpad changelog\n\n> What’s changed in Checkpad, newest first. Each change says who it’s for: organisers, attendees or both.\n\n${releases}`);
