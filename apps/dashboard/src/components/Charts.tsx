import { useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Comparison } from '../lib/analytics';

// Analytics building blocks at the dashboard's 75% scale: Figma "Stat tile" and the bar
// charts in "Event analytics" and "Analytics".

/**
 * `compare` is how the number sits against something, e.g. the team's other events, as chips
 * under it. `children` (a SplitBar of what makes up the number) go between the note and them.
 */
export function StatTile({
	label,
	value,
	note,
	compare = [],
	size = 'md',
	className = '',
	children,
}: {
	label: string;
	value: string;
	note?: string;
	/** lg for the one figure a page leads with */
	size?: 'md' | 'lg';
	compare?: { direction: Comparison['direction']; text: string }[];
	className?: string;
	children?: ReactNode;
}) {
	return (
		<div className={`flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-med-blue bg-white px-5 py-4 md:px-5 md:py-5 ${className}`}>
			<p className="truncate text-sm leading-normal text-med-blue">{label}</p>
			<p className={`font-display leading-tight ${size === 'lg' ? 'text-6xl' : 'text-4xl'}`}>{value}</p>
			{note && <p className="text-xs leading-normal text-med-blue">{note}</p>}
			{children && <div className="pt-2 pb-1">{children}</div>}
			{compare.length > 0 && (
				<ul className="flex flex-wrap gap-1.5 pt-2">
					{compare.map((c) => (
						<li key={c.text}>
							<Delta {...c} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

/**
 * A comparison as a chip: up, down or level by shape as well as words, since the palette has no
 * red or green and colour alone wouldn't carry it anyway.
 */
export function Delta({ direction, text }: { direction: Comparison['direction']; text: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full bg-light-blue px-2.5 py-1 text-xs leading-normal font-semibold text-dark-blue">
			<svg aria-hidden="true" viewBox="0 0 8 8" className="size-2 shrink-0 fill-current">
				{direction === 'same' ? <rect x="0" y="3" width="8" height="2" rx="1" /> : <path d={direction === 'up' ? 'M4 1 8 7H0z' : 'M4 7 0 1h8z'} />}
			</svg>
			{text}
		</span>
	);
}

/** A card with a chart or list: Figma's section heading and caption, then the content. */
export function ChartCard({
	title,
	caption,
	legend,
	level = 3,
	className = '',
	children,
}: {
	title: string;
	caption: string;
	legend?: Series[];
	/** 2 on a page of its own, 3 under an event's Analytics heading, 4 within one of its sections. */
	level?: 2 | 3 | 4;
	className?: string;
	children: ReactNode;
}) {
	const Heading = `h${level}` as const;
	return (
		<section className={`flex min-w-0 flex-col gap-4 rounded-xl border border-med-blue bg-white px-6 py-5 ${className}`}>
			<div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
				{/* The title keeps at least 13rem: a wide legend drops below it rather than squeezing it onto two lines */}
				<div className="flex min-w-0 flex-1 basis-52 flex-col gap-1 leading-normal">
					<Heading className="font-display text-lg">{title}</Heading>
					<p className="text-xs text-pretty text-med-blue">{caption}</p>
				</div>
				{legend && <Legend series={legend} />}
			</div>
			{children}
		</section>
	);
}

/** Two shares of one whole as a single bar, with each part labelled below: its value and share, or its `detail`. */
export function SplitBar({ parts, label }: { parts: { name: string; value: number; className: string; detail?: string }[]; label: string }) {
	const total = parts.reduce((n, p) => n + p.value, 0);
	return (
		<div className="flex flex-col gap-1.5">
			<div role="img" aria-label={`${label}: ${parts.map((p) => `${p.value} ${p.name.toLowerCase()}`).join(', ')}`} className="flex h-[7.5px] gap-0.5 overflow-hidden rounded-full bg-light-blue">
				{total > 0 && parts.map((p) => (p.value > 0 ? <div key={p.name} className={p.className} style={{ flexGrow: p.value, flexBasis: 0 }} /> : null))}
			</div>
			<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs leading-normal">
				{parts.map((p) => (
					<li key={p.name} className="flex items-center gap-1.5">
						<span aria-hidden="true" className={`size-[9px] rounded-xs ${p.className}`} />
						{p.name} <span className="text-med-blue">{p.detail ?? `${p.value} · ${total ? Math.round((p.value / total) * 100) : 0}%`}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

export interface Series {
	name: string;
	/** A brand token class, e.g. bg-dark-blue. */
	className: string;
}

export interface Bar {
	/** Axis label; empty to skip (only every other label fits). */
	label: string;
	/** One value per series, bottom up. */
	values: number[];
	/** Tooltip heading, e.g. "18:15–18:30". */
	title: string;
	/** Tooltip lines, one per series. */
	lines: string[];
	/** Shows the bar's value above it: selective labels, never every bar. */
	showValue?: string;
	/** The table view's cells, one per series, when the values alone would mislead (a 0 for "not recorded") */
	cells?: string[];
}

export function Legend({ series }: { series: Series[] }) {
	return (
		<ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
			{series.map((s) => (
				<li key={s.name} className="flex items-center gap-1.5 text-xs leading-normal">
					<span aria-hidden="true" className={`size-[9px] rounded-xs ${s.className}`} />
					{s.name}
				</li>
			))}
		</ul>
	);
}

/**
 * Keyboard and pointer state shared by the charts. The plot is one Tab stop: the arrow keys,
 * Home and End step through the bars (or points), and a live region reads out each one, so
 * nobody tabs through dozens of bars to get past a chart. Hover shows a tooltip; so does a tap.
 */
function useChartNav(count: number) {
	const [active, setActive] = useState<number | null>(null);
	const [announced, setAnnounced] = useState(false);
	function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		const last = count - 1;
		const next =
			e.key === 'ArrowRight' || e.key === 'ArrowDown'
				? Math.min(last, (active ?? -1) + 1)
				: e.key === 'ArrowLeft' || e.key === 'ArrowUp'
					? Math.max(0, (active ?? count) - 1)
					: e.key === 'Home'
						? 0
						: e.key === 'End'
							? last
							: null;
		if (e.key === 'Escape') return setActive(null);
		if (next === null || count === 0) return;
		e.preventDefault();
		setActive(next);
		setAnnounced(true);
	}
	return {
		active,
		/** Only what the keyboard reached is read out; hovering stays quiet */
		announce: announced ? active : null,
		plot: { tabIndex: 0, onKeyDown, onBlur: () => (setActive(null), setAnnounced(false)) },
		column: (i: number) => ({
			onMouseEnter: () => setActive(i),
			onMouseLeave: () => setActive(null),
			onClick: () => setActive((a) => (a === i ? null : i)),
		}),
	};
}

/** "Check-ins per 15 minutes: 36 bars, 16:00 to 01:00. Highest: 17:00–17:15, 9 pre-registered, 2 walk-ins." */
function chartSummary(label: string, items: { title: string; lines: string[]; total: number }[], noun: [string, string] = ['bar', 'bars']) {
	if (!items.length) return `${label}: nothing to show yet.`;
	const top = items.reduce((m, it) => (it.total > m.total ? it : m));
	const span = items.length === 1 ? items[0].title : `${items[0].title} to ${items[items.length - 1].title}`;
	return `${label}: ${items.length} ${items.length === 1 ? noun[0] : noun[1]}, ${span}. Highest: ${top.title}, ${top.lines.join(', ')}. Use the arrow keys to go through them, or show the chart as a table.`;
}

/**
 * A chart with a "Show as table" switch under it: the same numbers in rows, for anyone who'd
 * rather read them than hover, and for screen readers.
 */
function ChartFrame({ chart, table }: { chart: ReactNode; table: ReactNode }) {
	const [asTable, setAsTable] = useState(false);
	return (
		<div className="flex flex-col gap-2">
			{asTable ? table : chart}
			<button
				type="button"
				onClick={() => setAsTable((t) => !t)}
				className="self-end rounded text-xs leading-normal font-semibold text-med-blue underline decoration-med-blue/40 underline-offset-4 outline-none hover:text-dark-blue hover:decoration-dark-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-med-blue"
			>
				{asTable ? 'Show as chart' : 'Show as table'}
			</button>
		</div>
	);
}

/** The rows of a chart's table: what each bar or point is, then its numbers. */
function ChartTable({ label, heading, columns, rows }: { label: string; heading: string; columns: string[]; rows: { title: string; cells: string[] }[] }) {
	return (
		<div className="max-h-[260px] overflow-y-auto">
			<table className="w-full text-sm leading-normal">
				<caption className="sr-only">{label}</caption>
				<thead className="sticky top-0 bg-white">
					<tr className="text-xs text-med-blue">
						<th scope="col" className="pb-1.5 text-left font-semibold">
							{heading}
						</th>
						{columns.map((c) => (
							<th key={c} scope="col" className="pb-1.5 pl-3 text-right font-semibold">
								{c}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => (
						<tr key={i} className="border-t border-light-blue">
							<th scope="row" className="py-1.5 text-left font-normal">
								{r.title}
							</th>
							{r.cells.map((c, j) => (
								<td key={j} className="py-1.5 pl-3 text-right tabular-nums">
									{c}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Stacked bars on one axis. Gridlines are recessive (light blue), the baseline stronger; each
 * column is a hover target with a tooltip, bigger than the bar itself. `heading` names the bars
 * in the table view: "Time", "Event", "Day".
 */
export function BarChart({
	bars,
	series,
	ticks,
	formatTick = String,
	label,
	heading,
}: {
	bars: Bar[];
	series: Series[];
	ticks: number[];
	formatTick?: (n: number) => string;
	label: string;
	heading: string;
}) {
	const nav = useChartNav(bars.length);
	const { active } = nav;
	const max = ticks[ticks.length - 1] || 1;
	const summary = chartSummary(
		label,
		bars.map((b) => ({ title: b.title, lines: b.lines, total: b.values.reduce((a, v) => a + v, 0) })),
	);

	const chart = (
		<div className="relative h-[174px] w-full">
			{/* Axis and gridlines: the plot runs from 6px to 156px, labels sit below */}
			{ticks.map((t, i) => {
				const y = 156 - (t / max) * 150;
				return (
					<div key={t} aria-hidden="true">
						<div className={`absolute right-0 left-[27px] h-px ${i === 0 ? 'bg-med-blue/50' : 'bg-light-blue'}`} style={{ top: y }} />
						<p className="absolute left-0 w-[20px] -translate-y-1/2 text-right text-xs leading-normal text-med-blue" style={{ top: y }}>
							{formatTick(t)}
						</p>
					</div>
				);
			})}
			<div
				role="img"
				aria-roledescription="chart"
				aria-label={summary}
				{...nav.plot}
				className="absolute top-[6px] right-0 bottom-[18px] left-[27px] flex rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-med-blue"
			>
				{bars.map((bar, i) => {
					const total = bar.values.reduce((a, b) => a + b, 0);
					const flip = i > bars.length * 0.6;
					return (
						<div key={i} {...nav.column(i)} className={`relative flex flex-1 flex-col items-center justify-end rounded ${active === i ? 'bg-light-blue/40' : ''}`}>
							{/* Sits on the bar without taking its height, so a tall bar isn't squashed to fit the label */}
							{bar.showValue && total > 0 && (
								<p className="absolute mb-1 text-xs leading-normal font-bold" style={{ bottom: `${(total / max) * 100}%` }} aria-hidden="true">
									{bar.showValue}
								</p>
							)}
							{/* Segments bottom up, a 1.5px surface gap between them; only the top one is rounded.
							    18px wide, thinner when many bars (a day each for months of registrations) share the width */}
							<div className="flex w-[min(18px,70%)] shrink-0 flex-col-reverse gap-0.5" style={{ height: `${(total / max) * 100}%` }}>
								{bar.values.map((v, s) =>
									v > 0 ? (
										<div
											key={s}
											className={`${series[s].className} ${bar.values.slice(s + 1).every((n) => n === 0) ? 'rounded-t-sm' : ''}`}
											style={{ flexGrow: v, flexBasis: 0 }}
										/>
									) : null,
								)}
							</div>
							{bar.label && (
								<p className="absolute top-full mt-1 text-xs leading-normal whitespace-nowrap text-med-blue" aria-hidden="true">
									{bar.label}
								</p>
							)}
							{active === i && (
								<div
									aria-hidden="true"
									className={`pointer-events-none absolute z-10 flex flex-col gap-1 rounded-lg border border-med-blue bg-white py-2.5 pr-3 pl-2.5 text-left whitespace-nowrap shadow-[0_4.5px_12px_rgb(17_45_78/0.14)] ${
										flip ? 'right-[calc(50%+15px)]' : 'left-[calc(50%+15px)]'
									}`}
									style={{ bottom: `${Math.min(80, (total / max) * 100)}%` }}
								>
									<p className="text-xs leading-normal font-bold">{bar.title}</p>
									{bar.lines.map((line, s) => (
										<p key={s} className="flex items-center gap-1.5 text-xs leading-normal">
											{series[s] && <span aria-hidden="true" className={`size-[7.5px] rounded-xs ${series[s].className}`} />}
											{line}
										</p>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
			<p aria-live="polite" className="sr-only">
				{nav.announce !== null && bars[nav.announce] ? `${bars[nav.announce].title}: ${bars[nav.announce].lines.join(', ')}` : ''}
			</p>
		</div>
	);

	return (
		<ChartFrame
			chart={chart}
			table={
				<ChartTable
					label={label}
					heading={heading}
					columns={series.map((s) => s.name)}
					rows={bars.map((b) => ({ title: b.title, cells: b.cells ?? b.values.map((v) => formatTick(v)) }))}
				/>
			}
		/>
	);
}

export interface Point {
	label: string;
	value: number;
	title: string;
	lines: string[];
}

/** A running total as a line on the same axis as BarChart; works like it for the keyboard, and has the same table view. */
export function LineChart({ points, ticks, label, heading, valueName }: { points: Point[]; ticks: number[]; label: string; heading: string; valueName: string }) {
	const nav = useChartNav(points.length);
	const { active } = nav;
	const max = ticks[ticks.length - 1] || 1;
	const n = Math.max(1, points.length);
	// x as a share of the plot width: the middle of each column, as BarChart places bars
	const x = (i: number) => ((i + 0.5) / n) * 100;
	const y = (v: number) => 100 - (v / max) * 100;
	const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join(' ');
	const summary = chartSummary(
		label,
		points.map((p) => ({ title: p.title, lines: p.lines, total: p.value })),
		['point', 'points'],
	);

	const chart = (
		<div className="relative h-[174px] w-full">
			{ticks.map((t, i) => {
				const top = 156 - (t / max) * 150;
				return (
					<div key={t} aria-hidden="true">
						<div className={`absolute right-0 left-[27px] h-px ${i === 0 ? 'bg-med-blue/50' : 'bg-light-blue'}`} style={{ top }} />
						<p className="absolute left-0 w-[20px] -translate-y-1/2 text-right text-xs leading-normal text-med-blue" style={{ top }}>
							{t}
						</p>
					</div>
				);
			})}
			<div
				role="img"
				aria-roledescription="chart"
				aria-label={summary}
				{...nav.plot}
				className="absolute top-[6px] right-0 bottom-[18px] left-[27px] rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-med-blue"
			>
				<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
					<path d={path} fill="none" className="stroke-dark-blue" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
				</svg>
				<div className="absolute inset-0 flex">
					{points.map((p, i) => (
						<div key={i} {...nav.column(i)} className={`relative flex-1 rounded ${active === i ? 'bg-light-blue/40' : ''}`}>
							{active === i && (
								<span aria-hidden="true" className="absolute left-1/2 size-[9px] -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-dark-blue" style={{ bottom: `${100 - y(p.value)}%` }} />
							)}
							{p.label && (
								<p className="absolute top-full left-1/2 mt-1 -translate-x-1/2 text-xs leading-normal whitespace-nowrap text-med-blue" aria-hidden="true">
									{p.label}
								</p>
							)}
							{active === i && (
								<div
									aria-hidden="true"
									className={`pointer-events-none absolute z-10 flex flex-col gap-1 rounded-lg border border-med-blue bg-white py-2.5 pr-3 pl-2.5 text-left whitespace-nowrap shadow-[0_4.5px_12px_rgb(17_45_78/0.14)] ${
										i > points.length * 0.6 ? 'right-[calc(50%+15px)]' : 'left-[calc(50%+15px)]'
									}`}
									style={{ bottom: `${Math.min(80, 100 - y(p.value))}%` }}
								>
									<p className="text-xs leading-normal font-bold">{p.title}</p>
									{p.lines.map((line, s) => (
										<p key={s} className="text-xs leading-normal">
											{line}
										</p>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
			<p aria-live="polite" className="sr-only">
				{nav.announce !== null && points[nav.announce] ? `${points[nav.announce].title}: ${points[nav.announce].lines.join(', ')}` : ''}
			</p>
		</div>
	);

	return (
		<ChartFrame
			chart={chart}
			table={<ChartTable label={label} heading={heading} columns={[valueName]} rows={points.map((p) => ({ title: p.title, cells: [String(p.value)] }))} />}
		/>
	);
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** One group's check-ins of its total, as a bar: a ticket type or an answer to a question. */
export function CheckedInRow({ name, checkedIn, total }: { name: string; checkedIn: number; total: number }) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-start gap-1.5 leading-normal">
				<p className="min-w-0 flex-1 truncate text-sm font-bold" title={name}>
					{name}
				</p>
				<p className="shrink-0 text-xs text-med-blue">
					{checkedIn} of {total} · {pct(checkedIn, total)}%
				</p>
			</div>
			<div className="h-[7.5px] overflow-hidden rounded-full bg-light-blue" role="presentation">
				<div className="h-full bg-dark-blue" style={{ width: `${pct(checkedIn, total)}%` }} />
			</div>
		</div>
	);
}

/**
 * An answer's registrations as a share of everyone who answered the question: who checked in,
 * then who didn't (the Registrations chart's colours), on a full-width track.
 */
export function AnswerRow({ name, checkedIn, total, answered }: { name: string; checkedIn: number; total: number; answered: number }) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-start gap-1.5 leading-normal">
				<p className="min-w-0 flex-1 truncate text-sm font-bold" title={name}>
					{name}
				</p>
				<p className="shrink-0 text-xs text-med-blue">
					{total} registered · {checkedIn} checked in
				</p>
			</div>
			<div className="flex h-[7.5px] overflow-hidden rounded-full bg-light-blue" role="presentation">
				<div className="h-full bg-dark-blue" style={{ width: `${(checkedIn / answered) * 100}%` }} />
				{/* Hollow, as med-blue means walk-ins */}
				<div className="h-full border border-med-blue bg-white" style={{ width: `${((total - checkedIn) / answered) * 100}%` }} />
			</div>
		</div>
	);
}
