// Attendee help as Markdown (/help.md), for agents and LLMs. The HTML page links it.
import type { APIRoute } from 'astro';
import { HELP_SECTIONS } from '../lib/help';
import { helpMarkdown, markdownResponse } from '../lib/markdown';

export const GET: APIRoute = () => markdownResponse(helpMarkdown(HELP_SECTIONS));
