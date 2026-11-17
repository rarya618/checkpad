// The attendee pages against the real check-in API. Each test starts from the seeded demo
// events (functions/scripts/seed-emulator.ts):
//   checkpad-demo                  open, self-serve walk-ins on
//   checkpad-demo-registered-only  open, walk-ins off
//   gdg-september-meetup           closed, finished
//   gdg-future-meetup              closed, starts 5pm Thu 14 March 2030; team gdg-sydney
// attendee@sample.com, attendee-2@sample.com and jane@example.com are on every list.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST;
const DOCUMENTS = `http://${FIRESTORE}/v1/projects/demo-checkpad/databases/(default)/documents`;
const REPO = fileURLToPath(new URL('../../..', import.meta.url));

test.beforeAll(() => {
	if (!FIRESTORE) throw new Error('Run inside `firebase emulators:exec` (see playwright.config.ts)');
});

test.beforeEach(() => {
	execFileSync('npm', ['run', 'seed', '-w', '@checkpad/functions'], { cwd: REPO, stdio: 'ignore' });
});

/** Writes straight to the emulator, as the dashboard would: `owner` skips security rules. */
const firestoreValue = (v: string | boolean | Date) =>
	v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v };

async function setDoc(path: string, fields: Record<string, string | boolean | Date>) {
	const mask = Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&');
	const body = { fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, firestoreValue(v)])) };
	const res = await fetch(`${DOCUMENTS}/${path}?${mask}`, {
		method: 'PATCH',
		headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	expect(res.ok).toBe(true);
}

async function checkIn(page: Page, email: string) {
	await page.getByLabel('Email').fill(email);
	await page.getByRole('button', { name: 'Check in' }).click();
}

test.describe('checking in', () => {
	test('someone on the list sees their name and ticket, whatever case they type', async ({ page }) => {
		await page.goto('/checkpad-demo');
		await expect(page).toHaveTitle('Check in · Checkpad Demo');
		await checkIn(page, '  Attendee@Sample.com ');
		await expect(page.getByText('You’re checked in')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Sample' })).toBeVisible();
		await expect(page.getByText('GOOGA263293408')).toBeVisible();
	});

	test('checking in twice shows the first check-in', async ({ page }) => {
		await page.goto('/checkpad-demo');
		await checkIn(page, 'jane@example.com');
		await expect(page.getByText('You’re checked in')).toBeVisible();
		await page.reload();
		await checkIn(page, 'jane@example.com');
		await expect(page.getByText('You’re already checked in')).toBeVisible();
		await expect(page.getByText(/^Checked in at \d{1,2}(:\d\d)?[ap]m\. Show this to one of the organisers$/)).toBeVisible();
	});

	test('someone not on the list can add themselves as a walk-in', async ({ page }) => {
		await page.goto('/checkpad-demo');
		await checkIn(page, 'new.person@example.com');
		await expect(page.getByText('new.person@example.com')).toBeVisible();
		await page.getByLabel('First name').fill('New');
		await page.getByLabel('Last name').fill('Person');
		await page.getByRole('button', { name: 'Check in' }).click();
		await expect(page.getByRole('heading', { name: 'New' })).toBeVisible();
		await expect(page.getByText('CPWALKIN0001')).toBeVisible();
	});

	test('with walk-ins off, someone not on the list is told to find an organiser', async ({ page }) => {
		await page.goto('/checkpad-demo-registered-only');
		await checkIn(page, 'stranger@example.com');
		await expect(page.getByRole('heading', { name: 'You’re not on the list' })).toBeVisible();
		await page.getByRole('button', { name: 'Try another email' }).click();
		await expect(page.getByLabel('Email')).toBeVisible();
	});

	test('a malformed email is caught before anything is sent', async ({ page }) => {
		await page.goto('/checkpad-demo');
		const requests: string[] = [];
		page.on('request', (r) => r.method() === 'POST' && requests.push(r.url()));
		await checkIn(page, 'not-an-email');
		await expect(page.getByText('Enter a full email address, like jane@example.com')).toBeVisible();
		expect(requests).toEqual([]);
	});
});

test.describe('open and closed', () => {
	test('a finished event shows check-in closed', async ({ page }) => {
		await page.goto('/gdg-september-meetup');
		await expect(page.getByRole('heading', { name: 'Check-in closed' })).toBeVisible();
		await expect(page.getByText('Check-in for September Meetup isn’t open.')).toBeVisible();
	});

	test('an event that hasn’t started counts down to it, by the calendar in its time zone', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-11T10:00:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Future Meetup' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Starts in 3 days' })).toBeVisible();
		await expect(page.getByText('Check-in opens at the event, so come back to this link once you’re there.')).toBeVisible();

		await page.clock.setSystemTime(new Date('2030-03-13T23:00:00+11:00'));
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Starts tomorrow' })).toBeVisible();

		await page.clock.setSystemTime(new Date('2030-03-14T14:10:00+11:00'));
		await page.reload();
		await expect(page.getByRole('heading', { name: 'Starts in 3 hours' })).toBeVisible();
		// The countdown keeps up while the page is open
		await page.clock.fastForward('02:20:00');
		await expect(page.getByRole('heading', { name: 'Starts in 30 minutes' })).toBeVisible();
	});

	test('Add to calendar saves the event with its check-in link', async ({ page }) => {
		await page.goto('/gdg-future-meetup');
		const link = page.getByRole('link', { name: 'Add to calendar' });
		await expect(link).toHaveAttribute('download', 'gdg-future-meetup.ics');
		const ics = decodeURIComponent((await link.getAttribute('href'))!.replace(/^data:text\/calendar;charset=utf-8,/, ''));
		expect(ics).toContain('DTSTART:20300314T060000Z');
		expect(ics).toContain('DTEND:20300314T090000Z');
		expect(ics).toContain('SUMMARY:Future Meetup');
		expect(ics.replace(/\r\n /g, '')).toContain(`URL:${new URL('/gdg-future-meetup', page.url()).href}`);
	});

	test('before check-in opens, the event’s ticket link is offered', async ({ page }) => {
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Not registered yet?' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Get a ticket' })).toHaveAttribute('href', 'https://example.com/tickets/future-meetup');
	});

	test('with no ticket link, only the countdown shows', async ({ page }) => {
		await setDoc('events/gdg-future-meetup', { ticketUrl: '' });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('link', { name: 'Add to calendar' })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Not registered yet?' })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Get a ticket' })).toHaveCount(0);
	});

	test('on the day, the ticket link goes and people can type their email while they wait', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T09:00:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Starts in 8 hours' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Get a ticket' })).toHaveCount(0);
		await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveCount(0);
		await expect(page.getByRole('status')).toHaveText('Waiting for check-in to open');
		await page.getByLabel('Email').fill('jane@example');
		await page.getByLabel('Email').press('Enter');
		await expect(page.getByText('Enter a full email address, like jane@example.com')).toBeVisible();
		await page.getByLabel('Email').fill('jane@example.com');
		await page.getByLabel('Email').press('Enter');
		await expect(page.getByRole('status')).toHaveText('You’re ready. Keep this page open.');
	});

	test('when check-in opens, someone waiting is one tap from checking in', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T16:50:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await page.getByLabel('Email').fill('jane@example.com');
		await setDoc('events/gdg-future-meetup', { status: 'open' });
		await page.clock.fastForward('00:31');
		await expect(page.getByText('Check-in’s open', { exact: true })).toBeVisible();
		await expect(page.getByLabel('Email')).toHaveValue('jane@example.com');
		// Focus waits on Check in, and the tab and a screen reader both say it's open
		await expect(page.getByRole('button', { name: 'Check in' })).toBeFocused();
		await expect(page).toHaveTitle(/^Open · /);
		await expect(page.getByText('Check-in’s open. Tap Check in.')).toBeAttached();
		await page.getByRole('button', { name: 'Check in' }).click();
		await expect(page.getByText('You’re checked in')).toBeVisible();
	});

	test('waiting past the start time doesn’t turn into Check-in closed', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T16:58:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Starts in 2 minutes' })).toBeVisible();
		await page.clock.fastForward('05:00');
		await page.getByLabel('Email').fill('jane@example.com');
		await expect(page.getByRole('heading', { name: 'Opens any minute' })).toBeVisible();
		await expect(page.getByText('Waiting a while? Find one of the organisers.')).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Check-in closed' })).toHaveCount(0);
	});

	test('arriving after the start time, with check-in not yet opened, still waits rather than saying closed', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T17:20:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Opens any minute' })).toBeVisible();
		await expect(page.getByLabel('Email')).toBeVisible();
	});

	test('closed by an organiser once the event started says closed', async ({ page }) => {
		await setDoc('events/gdg-future-meetup', { statusChangedAt: new Date('2030-03-14T19:30:00+11:00') });
		await page.clock.install({ time: new Date('2030-03-14T19:40:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Check-in closed' })).toBeVisible();
	});

	test('a switch tried and turned off before the event doesn’t count as closing it', async ({ page }) => {
		await setDoc('events/gdg-future-meetup', { statusChangedAt: new Date('2030-03-14T15:00:00+11:00') });
		await page.clock.install({ time: new Date('2030-03-14T17:10:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Opens any minute' })).toBeVisible();
	});

	test('waiting until the event ends turns into Check-in closed', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T19:58:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: 'Opens any minute' })).toBeVisible();
		await page.clock.fastForward('03:00');
		await expect(page.getByRole('heading', { name: 'Check-in closed' })).toBeVisible();
	});

	test('a whole email shows ready without pressing Enter', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T09:00:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await page.getByLabel('Email').fill('jane@example.com');
		await expect(page.getByRole('status')).toHaveText('You’re ready. Keep this page open.');
	});

	test('the page owns up when it can’t reach Checkpad, and recovers', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-03-14T09:00:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByLabel('Email')).toBeVisible();
		await page.route('**/api/events/**', (route) => route.abort());
		// One failed check isn't trouble; two in a row are. A jump fires a timer once, so two jumps
		await page.clock.fastForward('00:31');
		await expect(page.getByRole('status')).toHaveText('Waiting for check-in to open');
		await page.clock.fastForward('00:31');
		await expect(page.getByRole('status')).toHaveText('Can’t reach Checkpad. Still trying');
		await page.unroute('**/api/events/**');
		await page.clock.fastForward('00:31');
		await expect(page.getByRole('status')).toHaveText('Waiting for check-in to open');
	});

	test('on the day with walk-ins off, people without a ticket are told who to find', async ({ page }) => {
		await setDoc('events/gdg-future-meetup', { selfWalkIns: false });
		await page.clock.install({ time: new Date('2030-03-14T09:00:00+11:00') });
		await page.goto('/gdg-future-meetup');
		await expect(page.getByText('Not registered? Find one of the organisers at the door.')).toBeVisible();
	});

	test('the organiser’s switch opens an event before it starts', async ({ page }) => {
		await setDoc('events/gdg-future-meetup', { status: 'open' });
		await page.goto('/gdg-future-meetup');
		await checkIn(page, 'jane@example.com');
		await expect(page.getByText('You’re checked in')).toBeVisible();
	});

	test('closing check-in while the page is open stops the next attempt', async ({ page }) => {
		await page.goto('/checkpad-demo');
		await expect(page.getByLabel('Email')).toBeVisible();
		await setDoc('events/checkpad-demo', { status: 'closed' });
		await checkIn(page, 'jane@example.com');
		await expect(page.getByRole('heading', { name: 'Check-in closed' })).toBeVisible();
	});
});

test.describe('links', () => {
	test('an unknown event link says so', async ({ page }) => {
		await page.goto('/no-such-event');
		await expect(page.getByRole('heading', { name: 'Link not found' })).toBeVisible();
	});

	test('a team link goes to the team’s open event', async ({ page }) => {
		await setDoc('events/gdg-september-meetup', { status: 'open' });
		await page.goto('/team/gdg-sydney');
		await expect(page).toHaveURL('/gdg-september-meetup');
		await expect(page.getByLabel('Email')).toBeVisible();
	});

	test('with nothing open, a team link goes to the team’s next event', async ({ page }) => {
		await page.goto('/team/gdg-sydney');
		await expect(page).toHaveURL('/gdg-future-meetup');
		await expect(page.getByRole('heading', { name: /^Starts/ })).toBeVisible();
	});

	test('a team with no events says there’s nothing on', async ({ page }) => {
		await setDoc('teams/gdg-quiet', { name: 'GDG Quiet', slug: 'gdg-quiet' });
		await page.goto('/team/gdg-quiet');
		await expect(page.getByRole('heading', { name: 'No event right now' })).toBeVisible();
		await expect(page.getByText('GDG Quiet doesn’t have an event open for check-in.')).toBeVisible();
	});

	test('an unknown team link says so', async ({ page }) => {
		await page.goto('/team/no-such-team');
		await expect(page.getByRole('heading', { name: 'Link not found' })).toBeVisible();
	});
});

test.describe('when the API fails', () => {
	test('the page says to find an organiser if the event can’t load', async ({ page }) => {
		await page.route('**/api/**', (route) => route.abort());
		await page.goto('/checkpad-demo');
		await expect(page.getByRole('heading', { name: 'Can’t load check-in' })).toBeVisible();
	});

	test('a failed check-in can be tried again', async ({ page }) => {
		await page.goto('/checkpad-demo');
		await page.route('**/check-in', (route) => route.abort());
		await checkIn(page, 'jane@example.com');
		await expect(page.getByRole('alert')).toHaveText('Something went wrong. Check your connection and try again.');
		await page.unroute('**/check-in');
		await page.getByRole('button', { name: 'Check in' }).click();
		await expect(page.getByText('You’re checked in')).toBeVisible();
	});

	test('too many attempts from one network asks the attendee to wait', async ({ page }) => {
		await page.goto('/checkpad-demo');
		await page.route('**/check-in', (route) => route.fulfill({ status: 429, json: { error: 'rate-limited' } }));
		await checkIn(page, 'jane@example.com');
		await expect(page.getByRole('alert')).toContainText('Too many check-ins from this network');
	});
});
