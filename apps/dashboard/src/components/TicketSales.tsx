import { useState, type ReactNode } from 'react';
import { AMOUNTS, formatMoney, type TicketSales } from '../lib/payments';
import { ChartCard, StatTile } from './Charts';

// Analytics' Ticket sales, for an event whose import saved what tickets cost: what the organiser
// kept, by ticket type, everything the platform reported added up, and the codes used. Organisers
// only (payments.ts). Not in Figma.

// Ticket types shown before "Show all", as in By ticket type
const ROWS_SHOWN = 6;

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

export function EventTicketSales({ sales, sideClassName }: { sales: TicketSales; /** The side column's width on the page. */ sideClassName: string }) {
	const money = (cents: number) => formatMoney(cents, sales.currency);
	const earned = sales.totals[sales.earnedKey] ?? 0;
	const paid = sales.totals.paid;
	return (
		<>
			<div className="flex flex-col gap-4 md:flex-row md:items-start">
				<div className="flex min-w-0 flex-1 flex-col gap-4">
					<StatTile
						label={sales.earnedKey === 'earnings' ? 'Your earnings' : 'Paid by buyers'}
						value={money(earned)}
						note={
							sales.paidTickets
								? `From ${sales.paidTickets} paid ticket${sales.paidTickets === 1 ? '' : 's'}, ${money(Math.round(earned / sales.paidTickets))} each on average${
										sales.earnedKey === 'earnings' && paid ? `. Buyers paid ${money(paid)} with fees` : ''
									}`
								: 'No ticket was paid for'
						}
					/>
					<ChartCard level={4} title="By ticket type" caption={`Tickets with a payment, and what they ${sales.earnedKey === 'earnings' ? 'earned you' : 'brought in'}`}>
						<Folding count={sales.byType.length} noun="ticket types">
							{(shown) => (
								<SalesTable
									head={['Ticket type', 'Tickets', 'Average', sales.earnedKey === 'earnings' ? 'Earned' : 'Paid']}
									rows={sales.byType.slice(0, shown).map((t) => [t.name, String(t.tickets), money(Math.round(t.earned / t.tickets)), money(t.earned)])}
								/>
							)}
						</Folding>
					</ChartCard>
				</div>
				<ChartCard level={4} title="All the money" caption="Every amount the platform reported, added up across tickets" className={sideClassName}>
					<dl className="flex flex-col text-sm leading-normal">
						{AMOUNTS.filter((a) => sales.totals[a.key]).map((a) => (
							<div key={a.key} className="flex items-baseline gap-3 border-light-blue py-1.5 not-first:border-t">
								<dt className={`min-w-0 flex-1 ${a.key === sales.earnedKey ? 'font-bold' : ''}`}>{a.label}</dt>
								<dd className={`shrink-0 tabular-nums ${a.key === sales.earnedKey ? 'font-bold' : ''}`}>{money(sales.totals[a.key])}</dd>
							</div>
						))}
					</dl>
				</ChartCard>
			</div>
			{sales.codes.length > 0 && (
				<ChartCard level={4} title="Discount and access codes" caption="Tickets that used each code, what it took off, and how many of them came">
					<Folding count={sales.codes.length} noun="codes">
						{(shown) => (
							<SalesTable
								head={['Code', 'Tickets', 'Discount', 'Came']}
								rows={sales.codes
									.slice(0, shown)
									.map((c) => [
										<span key="code">
											<span className="font-semibold">{c.code}</span>
											<span className="ml-2 text-xs text-med-blue">{c.kind}</span>
										</span>,
										String(c.tickets),
										c.discount ? money(c.discount) : '–',
										`${c.checkedIn} of ${c.tickets} · ${pct(c.checkedIn, c.tickets)}%`,
									])}
							/>
						)}
					</Folding>
				</ChartCard>
			)}
		</>
	);
}

/** The first few rows, with the rest a click away. */
function Folding({ count, noun, children }: { count: number; noun: string; children: (shown: number) => ReactNode }) {
	const [all, setAll] = useState(false);
	// Folding away a single row saves nothing
	const folds = count > ROWS_SHOWN + 1;
	return (
		<>
			{children(folds && !all ? ROWS_SHOWN : count)}
			{folds && (
				<button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="self-start rounded text-sm font-semibold text-med-blue underline-offset-4 hover:underline">
					{all ? 'Show fewer' : `Show all ${count} ${noun}`}
				</button>
			)}
		</>
	);
}

/** A small table: the first column names the row, the rest are figures lined up on the right. */
function SalesTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
	return (
		<div className="-mx-1 overflow-x-auto px-1">
			<table className="w-full min-w-[420px] text-sm leading-normal">
				<thead>
					<tr className="text-xs text-med-blue">
						{head.map((h, i) => (
							<th key={h} scope="col" className={`pb-1.5 font-semibold ${i ? 'pl-4 text-right' : 'text-left'}`}>
								{h}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((cells, r) => (
						<tr key={r} className="border-t border-light-blue">
							{cells.map((cell, i) =>
								i ? (
									<td key={i} className="py-2 pl-4 text-right whitespace-nowrap tabular-nums">
										{cell}
									</td>
								) : (
									<th key={i} scope="row" className="py-2 text-left font-bold">
										{cell}
									</th>
								),
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
