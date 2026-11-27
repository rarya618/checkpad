import { describe, expect, it, vi } from 'vitest';
import { formatMoney, ticketSales, type TicketPayment } from './payments';
import type { RosterAttendee } from './roster';

vi.mock('./firebase', () => ({ db: {} }));

const attendee = (id: string, overrides: Partial<RosterAttendee> = {}): RosterAttendee => ({
	id,
	ticket: id,
	firstName: 'A',
	lastName: 'B',
	email: `${id}@example.com`,
	checkedInAt: null,
	walkIn: false,
	...overrides,
});

describe('ticketSales', () => {
	it('is nothing without payments', () => expect(ticketSales([], [attendee('T1')])).toBeNull());

	it('adds up amounts and counts paid tickets', () => {
		const payments: TicketPayment[] = [
			{ ticket: 'T1', amounts: { paid: 2000, price: 2000 } },
			{ ticket: 'T2', amounts: { paid: 0, price: 2000, discount: 2000 } },
			{ ticket: 'T3', amounts: { price: 1500 } },
		];
		const sales = ticketSales(payments, [])!;
		expect(sales.totals).toEqual({ paid: 2000, price: 5500, discount: 2000 });
		// T2's zero paid wins over its price; T3 has only a price
		expect(sales.paidTickets).toBe(2);
		expect(sales.earnedKey).toBe('paid');
		expect(sales.currency).toBeNull();
	});

	it('counts earnings as the organiser’s when the platform reports them', () => {
		const sales = ticketSales([{ ticket: 'T1', amounts: { paid: 2200, earnings: 2000 } }], [])!;
		expect(sales.earnedKey).toBe('earnings');
		expect(sales.byType).toEqual([{ name: 'Other', tickets: 1, earned: 2000 }]);
	});

	it('groups by ticket type from the list, matching tickets ignoring case, busiest first', () => {
		const roster = [attendee('t1', { ticketType: 'Student' }), attendee('T2', { ticketType: 'General' }), attendee('T3', { ticketType: 'General' })];
		const sales = ticketSales(
			[
				{ ticket: 'T1', amounts: { paid: 500 } },
				{ ticket: 'T2', amounts: { paid: 2000 } },
				{ ticket: 'T3', amounts: { paid: 2000 } },
				{ ticket: 'NOT-ON-LIST', amounts: { paid: 0 } },
			],
			roster,
		)!;
		expect(sales.byType).toEqual([
			{ name: 'General', tickets: 2, earned: 4000 },
			{ name: 'Student', tickets: 1, earned: 500 },
			{ name: 'Other', tickets: 1, earned: 0 },
		]);
	});

	it('tallies codes apart by kind, ignoring case, with their discounts and check-ins', () => {
		const roster = [attendee('T1', { checkedInAt: new Date() }), attendee('T2')];
		const sales = ticketSales(
			[
				{ ticket: 'T1', amounts: { discount: 500 }, discountCode: 'EARLY', accessCode: 'EARLY' },
				{ ticket: 'T2', amounts: { discount: 500 }, discountCode: 'early' },
				{ ticket: 'T3', amounts: {}, accessCode: 'VIP' },
			],
			roster,
		)!;
		expect(sales.codes).toEqual([
			{ code: 'EARLY', kind: 'Discount', tickets: 2, discount: 1000, checkedIn: 1 },
			{ code: 'EARLY', kind: 'Access', tickets: 1, discount: 0, checkedIn: 1 },
			{ code: 'VIP', kind: 'Access', tickets: 1, discount: 0, checkedIn: 0 },
		]);
	});

	it('takes the first currency any ticket names, in capitals', () =>
		expect(ticketSales([{ ticket: 'T1', amounts: {} }, { ticket: 'T2', amounts: {}, currency: 'usd' }], [])!.currency).toBe('USD'));
});

describe('formatMoney', () => {
	it('shows dollars with cents and thousands', () => {
		expect(formatMoney(803694, null)).toBe('$8,036.94');
		expect(formatMoney(0, null)).toBe('$0.00');
		expect(formatMoney(5, null)).toBe('$0.05');
	});
	it('shows negative amounts with a minus sign', () => expect(formatMoney(-1250, null)).toBe('−$12.50'));
	it('uses the platform’s currency', () => {
		expect(formatMoney(1250, 'USD')).toBe('USD\u00a012.50');
		expect(formatMoney(1250, 'AUD')).toBe('$12.50');
	});
	it('falls back to dollars for a currency it doesn’t know', () => expect(formatMoney(1250, 'NOT-A-CODE')).toBe('$12.50'));
});
