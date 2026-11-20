// What attendees paid for their tickets (events/{eventId}/payments/{ticket}, saved by imports),
// for Analytics' Ticket sales. Only organisers can read them (firestore.rules), so pages ask for
// them only when the person signed in is one.
import { collection, onSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { DashboardEvent } from './events';
import { db } from './firebase';
import { liveStore } from './live';
import type { RosterAttendee } from './roster';

export interface TicketPayment {
	/** The ticket number: the attendee's document ID. */
	ticket: string;
	/** Cents, by name (attendeeImport.ts moneyColumns): price, paid, passedOnFees, earnings… */
	amounts: Record<string, number>;
	currency?: string;
	discountCode?: string;
	accessCode?: string;
}

const EMPTY: TicketPayment[] = [];
const NONE: Record<string, TicketPayment[]> = {};

function toPayment(d: QueryDocumentSnapshot): TicketPayment {
	const data = d.data();
	return {
		ticket: d.id,
		amounts: data.amounts ?? {},
		...(data.currency && { currency: data.currency }),
		...(data.discountCode && { discountCode: data.discountCode }),
		...(data.accessCode && { accessCode: data.accessCode }),
	};
}

const payments = (eventId: string) => collection(db, 'events', eventId, 'payments');

const store = liveStore<TicketPayment[]>((eventId, emit, fail) => onSnapshot(payments(eventId), (snap) => emit(snap.docs.map(toPayment)), fail));

// Several events' payments, keyed by their IDs joined with commas (as roster.ts does for lists)
const manyStore = liveStore<Record<string, TicketPayment[]>>((key, emit, fail) => {
	const ids = key.split(',');
	const all: Record<string, TicketPayment[]> = {};
	const stops = ids.map((id) =>
		onSnapshot(
			payments(id),
			(snap) => {
				all[id] = snap.docs.map(toPayment);
				if (ids.every((i) => i in all)) emit({ ...all });
			},
			fail,
		),
	);
	return () => stops.forEach((stop) => stop());
});

/** An event's payments for organisers; empty for anyone else, and while they load. */
export function usePayments(event: DashboardEvent, organiser: boolean) {
	return store.use(organiser ? event.id : null) ?? EMPTY;
}

/** Several events' payments, by event ID, for organisers (Analytics across events); empty while they load. */
export function usePaymentsFor(events: DashboardEvent[], organiser: boolean) {
	const key = events.map((e) => e.id).sort().join(',');
	return manyStore.use(organiser && key ? key : null) ?? NONE;
}

// The amounts' names in the order they're listed, with what to call them. Each platform reports
// some of them; the rest don't show.
export const AMOUNTS: { key: string; label: string }[] = [
	{ key: 'paid', label: 'Paid by buyers' },
	{ key: 'price', label: 'Ticket prices' },
	{ key: 'earnings', label: 'Your earnings' },
	{ key: 'passedOnFees', label: 'Fees passed on to buyers' },
	{ key: 'absorbedFees', label: 'Fees you absorbed' },
	{ key: 'amexSurcharge', label: 'Amex surcharges' },
	{ key: 'afterpayFee', label: 'Afterpay fees' },
	{ key: 'zipFee', label: 'Zip fees' },
	{ key: 'discount', label: 'Discounts given' },
	{ key: 'refunds', label: 'Refunds' },
	{ key: 'refundedFees', label: 'Refunded fees' },
	{ key: 'feeRebate', label: 'Fee rebate' },
	{ key: 'tax', label: 'Tax' },
	{ key: 'customTax', label: 'Custom tax' },
	{ key: 'taxOnSales', label: 'Tax on sales' },
	{ key: 'taxOnBookingFees', label: 'Tax on booking fees' },
];

export interface TypeSales {
	name: string;
	/** Tickets of this type with a payment. */
	tickets: number;
	/** What the organiser kept: earnings where the platform says, else what buyers paid. */
	earned: number;
}

export interface CodeUse {
	code: string;
	kind: 'Discount' | 'Access';
	tickets: number;
	/** Discount given through it, in cents. */
	discount: number;
	checkedIn: number;
}

export interface TicketSales {
	/** Each amount added up across tickets, by name; only those some ticket has. */
	totals: Record<string, number>;
	/** The amount that's the organiser's: "earnings", or "paid" for platforms that don't report earnings. */
	earnedKey: 'earnings' | 'paid';
	/** Tickets someone paid something for. */
	paidTickets: number;
	byType: TypeSales[];
	codes: CodeUse[];
	currency: string | null;
}

/** Ticket sales from an event's payments, with each ticket's type and check-in from its list. */
export function ticketSales(payments: TicketPayment[], roster: RosterAttendee[]): TicketSales | null {
	if (!payments.length) return null;
	const people = new Map(roster.map((a) => [a.id.toLowerCase(), a]));
	const totals: Record<string, number> = {};
	for (const p of payments) for (const [k, v] of Object.entries(p.amounts)) totals[k] = (totals[k] ?? 0) + v;
	const earnedKey = 'earnings' in totals ? 'earnings' : 'paid';

	const types = new Map<string, TypeSales>();
	const codes = new Map<string, CodeUse>();
	let paidTickets = 0;
	for (const p of payments) {
		const person = people.get(p.ticket.toLowerCase());
		if ((p.amounts.paid ?? p.amounts.price ?? 0) > 0) paidTickets++;
		const name = person?.ticketType || 'Other';
		const t = types.get(name) ?? { name, tickets: 0, earned: 0 };
		t.tickets++;
		t.earned += p.amounts[earnedKey] ?? 0;
		types.set(name, t);
		for (const [kind, code] of [
			['Discount', p.discountCode],
			['Access', p.accessCode],
		] as const) {
			if (!code) continue;
			const k = `${kind}:${code.toLowerCase()}`;
			const c = codes.get(k) ?? { code, kind, tickets: 0, discount: 0, checkedIn: 0 };
			c.tickets++;
			if (kind === 'Discount') c.discount += p.amounts.discount ?? 0;
			if (person?.checkedInAt) c.checkedIn++;
			codes.set(k, c);
		}
	}
	return {
		totals,
		earnedKey,
		paidTickets,
		byType: [...types.values()].sort((a, b) => b.earned - a.earned || b.tickets - a.tickets),
		codes: [...codes.values()].sort((a, b) => b.tickets - a.tickets || a.code.localeCompare(b.code)),
		currency: payments.find((p) => p.currency)?.currency?.toUpperCase() ?? null,
	};
}

/** "$8,036.94", or in the platform's currency when it named one ("US$12.50"). Always with cents, so columns line up. */
export function formatMoney(cents: number, currency: string | null) {
	const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
	if (currency) {
		try {
			return new Intl.NumberFormat('en-AU', { style: 'currency', currency, ...options }).format(cents / 100);
		} catch {
			// An unknown currency code: fall back to plain dollars
		}
	}
	const sign = cents < 0 ? '−' : '';
	return `${sign}$${new Intl.NumberFormat('en-AU', options).format(Math.abs(cents) / 100)}`;
}
