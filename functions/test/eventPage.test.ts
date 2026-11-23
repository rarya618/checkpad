// Tests for event links' preview tags (eventPage.ts), against the Firestore emulator. Run as
// api.test.ts says. The handler is called directly with a stand-in check-in page, so nothing
// fetches the real site.
import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createEventPageHandler, withEventTags } from '../lib/eventPage.js';
import { clearFirestore } from '../scripts/emulator.ts';

const PROJECT = 'demo-checkpad';
assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Run inside `firebase emulators:exec` so FIRESTORE_EMULATOR_HOST is set');

const db = getFirestore(initializeApp({ projectId: PROJECT }, 'event-page'));
const SHELL = '<html><head><meta charset="utf-8"><title>Check in · checkpad</title><meta name="robots" content="noindex"></head><body></body></html>';

const event = {
	slug: 'test-meetup',
	name: 'GDG Sydney <Meetup> & "Friends"',
	description: 'Join us for our\n\nmonthly meetup',
	status: 'open',
	startsAt: Timestamp.fromDate(new Date('2026-12-10T07:00:00Z')),
	endsAt: Timestamp.fromDate(new Date('2026-12-10T10:00:00Z')),
	timeZone: 'Australia/Sydney',
	selfWalkIns: true,
};

beforeEach(async () => {
	await clearFirestore(PROJECT);
	await db.doc('events/e1').set(event);
});

/** Calls the handler like Hosting would, returning what it sent. */
async function open(path: string, shell = async () => SHELL, method = 'GET') {
	const sent = { status: 200, body: '', headers: {} as Record<string, string> };
	const res = {
		status(code: number) {
			sent.status = code;
			return res;
		},
		set(name: string, value: string) {
			sent.headers[name.toLowerCase()] = value;
			return res;
		},
		send(body: string) {
			sent.body = body;
			return res;
		},
	};
	await createEventPageHandler(db, shell)({ method, path } as never, res as never);
	return sent;
}

describe('event pages', () => {
	test("carry the event's name, date and description, escaped", async () => {
		const { status, body, headers } = await open('/test-meetup');
		assert.equal(status, 200);
		assert.match(body, /<title>Check in · GDG Sydney &lt;Meetup&gt; &amp; &quot;Friends&quot;<\/title>/);
		assert.match(body, /<meta property="og:title" content="GDG Sydney &lt;Meetup&gt; &amp; &quot;Friends&quot;">/);
		assert.match(body, /<meta name="description" content="Thu 10 December, 6:00 – 9:00 pm AEDT · Join us for our monthly meetup">/);
		assert.match(body, /<meta property="og:url" content="https:\/\/checkpad.app\/test-meetup">/);
		assert.match(headers['cache-control'], /s-maxage=300/);
		assert.match(headers['content-type'], /text\/html/);
	});

	test('stay out of search results', async () => {
		assert.match((await open('/test-meetup')).body, /<meta name="robots" content="noindex">/);
	});

	test('cut a long description at a word', () => {
		const page = withEventTags(SHELL, { ...event, description: 'word '.repeat(100), startsAt: '2026-12-10T07:00:00Z', endsAt: '2026-12-10T10:00:00Z' });
		const description = page.match(/<meta name="description" content="([^"]*)">/)![1];
		assert.ok(description.length < 260);
		assert.match(description, / word…$/);
	});

	test('serve the plain page with a 404 for an unknown or malformed link', async () => {
		for (const path of ['/nope', '/Not-A-Slug']) {
			const { status, body } = await open(path);
			assert.equal(status, 404);
			assert.equal(body, SHELL);
		}
	});

	test("serve the plain page, uncached, when the event can't be read", async () => {
		const broken = createEventPageHandler({ collection: () => { throw new Error('Firestore is down'); } } as never, async () => SHELL);
		const sent: Record<string, unknown> = { status: 200 };
		const res = { status: (s: number) => ((sent.status = s), res), set: (k: string, v: string) => ((sent[k] = v), res), send: (b: string) => ((sent.body = b), res) };
		await broken({ method: 'GET', path: '/test-meetup' } as never, res as never);
		assert.equal(sent.status, 200);
		assert.equal(sent.body, SHELL);
		assert.equal(sent['Cache-Control'], 'no-store');
	});

	test("answer 502 when the check-in page can't be fetched", async () => {
		const { status } = await open('/test-meetup', async () => {
			throw new Error('offline');
		});
		assert.equal(status, 502);
	});

	test('refuse anything but GET and HEAD', async () => {
		assert.equal((await open('/test-meetup', undefined, 'POST')).status, 405);
	});
});
