import { describe, expect, it, vi } from 'vitest';
import { parseCents, parseCheckedInAt, parseRegisteredAt, planFromText, rowList, skippedCount, type ImportPlan } from './attendeeImport';

vi.mock('./roster', () => ({}));

const plan = (text: string, roster: Parameters<typeof planFromText>[2] = [], options = {}) => planFromText('list.csv', text, roster, options) as ImportPlan;

describe('parseCents', () => {
	it.each([
		['$1,234.50', 123450],
		['12', 1200],
		['12.5', 1250],
		['0.05', 5],
		['-$5.00', -500],
		['($5.00)', -500],
		['AUD 20.00', 2000],
		['20.00 AUD', 2000],
		['€3', 300],
		['  $7.10 ', 710],
	])('reads %j as %d', (text, cents) => expect(parseCents(text)).toBe(cents));
	it.each(['', 'hidden', 'free', '1,23.00', '1.234', '$'])('leaves out %j', (text) => expect(parseCents(text)).toBeUndefined());
});

describe('parseRegisteredAt', () => {
	it('reads Luma’s ISO times', () => expect(parseRegisteredAt('2026-08-21T03:12:45.123Z')?.toISOString()).toBe('2026-08-21T03:12:45.123Z'));
	it('reads Bevy’s times as UTC', () => expect(parseRegisteredAt('2026-08-21 03:12:45')?.toISOString()).toBe('2026-08-21T03:12:45.000Z'));
	it('reads a leap day', () => expect(parseRegisteredAt('2028-02-29')?.toISOString()).toBe('2028-02-29T00:00:00.000Z'));
	it('reads a date alone as midnight UTC', () => expect(parseRegisteredAt('2026-08-21')?.toISOString()).toBe('2026-08-21T00:00:00.000Z'));
	it('reads 12-hour times in the zone it’s given', () => {
		expect(parseRegisteredAt('2026-08-21 1:12 pm', 'AEST')?.toISOString()).toBe('2026-08-21T03:12:00.000Z');
		expect(parseRegisteredAt('2026-08-21 12:00 am', 'UTC')?.toISOString()).toBe('2026-08-21T00:00:00.000Z');
		expect(parseRegisteredAt('2026-08-21 12:00 pm', 'UTC')?.toISOString()).toBe('2026-08-21T12:00:00.000Z');
	});
	it('prefers the time’s own offset to the zone given', () => expect(parseRegisteredAt('2026-08-21 10:00 +1000', 'PST')?.toISOString()).toBe('2026-08-21T00:00:00.000Z'));
	it.each([
		['08/09/2026', ''],
		['2026-08-21 13:00 pm', ''],
		['2026-08-21 0:30 am', ''],
		['2026-08-21 10:00', 'XYZT'],
		['2026-02-30', ''],
		['2026-04-31 10:00', ''],
		['2026-13-01', ''],
		['', ''],
	])('leaves out %j (zone %j) rather than guess', (text, zone) => expect(parseRegisteredAt(text, zone)).toBeUndefined());
});

describe('parseCheckedInAt', () => {
	it('reads Humanitix’s check-in times', () => expect(parseCheckedInAt('Sat 10th Oct 2026, 11:25 am AEDT')?.toISOString()).toBe('2026-10-10T00:25:00.000Z'));
	it('reads them without the weekday or suffix', () => expect(parseCheckedInAt('1 October 2026 9:05 pm UTC')?.toISOString()).toBe('2026-10-01T21:05:00.000Z'));
	it('falls back to the registration formats', () => expect(parseCheckedInAt('2026-08-21 03:12:45')?.toISOString()).toBe('2026-08-21T03:12:45.000Z'));
	it('leaves out an unknown month', () => expect(parseCheckedInAt('Sat 10th Foo 2026, 11:25 am AEDT')).toBeUndefined());
});

describe('planFromText', () => {
	it('says which columns are missing', () =>
		expect(planFromText('list.csv', 'Phone\n123', [])).toEqual({ kind: 'missing-columns', fileName: 'list.csv', missing: ['first name', 'email', 'ticket number'] }));

	it('matches headers however they’re written, and recognises Bevy', () => {
		const p = plan('First Name,last_name,EMAIL,Ticket number,Ticket title,Order number\nAda,Lovelace,ADA@Example.com,T1,General,O1\n');
		expect(p.source).toBe('bevy');
		expect(p.added).toEqual([{ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', ticket: 'T1', ticketType: 'General', answers: {} }]);
	});

	it('splits a lone name column, and copes with quoted commas', () => {
		const p = plan('Name,Email,Ticket\n"Mary Jane Smith",mj@example.com,T1\nCher,cher@example.com,T2\n"  ",blank@example.com,T3\n');
		expect(p.added.map((r) => [r.firstName, r.lastName])).toEqual([
			['Mary Jane', 'Smith'],
			['Cher', ''],
		]);
		expect(p.skipped.get('No first name')).toEqual([4]);
	});

	it('skips people who aren’t coming, by row number', () => {
		const p = plan('First name,Email,Ticket,Status\nA,a@example.com,T1,approved\nB,b@example.com,T2,Waitlist\nC,c@example.com,T3,\nD,d@example.com,T4,Maybe\n');
		expect(p.added.map((r) => r.ticket)).toEqual(['T1', 'T3']);
		expect(p.skipped).toEqual(
			new Map([
				['On the waitlist', [3]],
				['Status is “Maybe”', [5]],
			]),
		);
		expect(skippedCount(p)).toBe(2);
	});

	it('skips rows the database wouldn’t take', () => {
		const p = plan('First name,Email,Ticket\nA,,T1\nB,not-an-email,T2\nC,c@example.com,\nD,d@example.com,a/b\nE,e@example.com,T5\nF,f@example.com,t5\n');
		expect(p.skipped).toEqual(
			new Map([
				['No email address', [2]],
				['Email address isn’t valid', [3]],
				['No ticket number', [4]],
				['Ticket number can’t be used', [5]],
				['Same ticket number as an earlier row', [7]],
			]),
		);
	});

	it('ignores blank lines, so row numbers still match the spreadsheet’s non-blank rows', () => {
		const p = plan('First name,Email,Ticket\n\n,,\nA,a@example.com,T1\n');
		expect(p.rowCount).toBe(1);
		expect(p.added).toHaveLength(1);
	});

	it('keeps one ticket per email unless asked', () => {
		const text = 'First name,Email,Ticket\nA,a@example.com,T1\nA,a@example.com,T2\n';
		expect(plan(text).skipped.get('Same email as an earlier row')).toEqual([3]);
		expect(plan(text, [], { keepSharedEmails: true }).added).toHaveLength(2);
	});

	it('updates tickets already on the list, and leaves matching ones alone', () => {
		const roster = [
			{ ticket: 'T1', email: 'a@example.com', firstName: 'A', lastName: 'One', checkedInAt: null, walkIn: false },
			{ ticket: 'T2', email: 'b@example.com', firstName: 'B', lastName: 'Two', checkedInAt: null, walkIn: false },
		];
		const p = plan('First name,Last name,Email,Ticket\nA,One,a@example.com,T1\nBee,Two,b@example.com,t2\n', roster);
		expect(p.unchanged).toBe(1);
		expect(p.updated.map((r) => r.firstName)).toEqual(['Bee']);
		expect(p.added).toEqual([]);
	});

	it('keeps answers to the organiser’s questions, not the platform’s columns', () => {
		const p = plan('First name,Email,Ticket,Phone number,What do you hope to learn?,Dietary needs\nA,a@example.com,T1,0400 000 000,Astro,\n');
		expect(p.allQuestions).toEqual(['What do you hope to learn?', 'Dietary needs']);
		expect(p.added[0].answers).toEqual({ 'What do you hope to learn?': 'Astro' });
	});

	it('numbers Humanitix’s tickets within their order', () => {
		const p = plan('First name,Email,Ticket no,Order id\nA,a@example.com,2nd,S6TFX6HG\n');
		expect(p.added[0].ticket).toBe('S6TFX6HG-2');
	});

	it('reads payments, leaving out free tickets with no code', () => {
		const p = plan('First name,Email,Ticket,Paid,Currency,Coupon code\nA,a@example.com,T1,$20.00,AUD,\nB,b@example.com,T2,$0.00,AUD,\nC,c@example.com,T3,$0.00,,FREE\n');
		expect(p.payments).toEqual([
			{ ticket: 'T1', payment: { amounts: { paid: 2000 }, currency: 'AUD' } },
			{ ticket: 'T3', payment: { amounts: { paid: 0 }, discountCode: 'FREE' } },
		]);
	});

	it('brings in past check-ins with a readable time, and counts those without', () => {
		const p = plan('First name,Email,Ticket,Checked in at\nA,a@example.com,T1,2026-08-21T03:12:45Z\nB,b@example.com,T2,yesterday\nC,c@example.com,T3,\nD,d@example.com,T4,2999-01-01T00:00:00Z\n');
		expect(p.checkIns).toEqual([{ ticket: 'T1', at: new Date('2026-08-21T03:12:45Z') }]);
		expect(p.checkInsWithoutTime).toEqual([3, 5]);
	});
});

describe('rowList', () => {
	it('lists rows in words', () => {
		expect(rowList([18])).toBe('row 18');
		expect(rowList([18, 47])).toBe('rows 18 and 47');
		expect(rowList([18, 47, 90])).toBe('rows 18, 47 and 90');
	});
});
