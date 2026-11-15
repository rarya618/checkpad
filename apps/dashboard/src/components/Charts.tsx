import { useState, type ReactNode } from 'react';
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
	className = '',
	children,
}: {
	label: string;
	value: string;
	note?: string;
	compare?: { direction: Comparison['direction']; text: string }[];
	className?: string;
	children?: ReactNode;
}) {
	return (
		<div className={`flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-med-blue bg-white px-5 py-4 md:px-5 md:py-5 ${className}`}>
			<p className="truncate text-sm leading-normal text-med-blue">{label}</p>
			<p className="font-display text-4xl leading-tight">{value}</p>
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
				<div className="flex min-w-0 flex-1 flex-col gap-1 leading-normal">
					<Heading className="font-display text-lg">{title}</Heading>
					<p className="text-xs text-med-blue">{caption}</p>
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
}

export function Legend({ series }: { series: Series[] }) {
	return (
		<ul className="flex shrink-0 items-center gap-4">
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
 * Stacked bars on one axis. Gridlines are recessive (light blue), the baseline stronger; each
 * column is a hover/focus target with a tooltip, bigger than the bar itself.
 */
export function BarChart({ bars, series, ticks, formatTick = String, label }: { bars: Bar[]; series: Series[]; ticks: number[]; formatTick?: (n: number) => string; label: string }) {
	const [active, setActive] = useState<number | null>(null);
	const max = ticks[ticks.length - 1] || 1;

	return (
		<div role="group" aria-label={label} className="relative h-[174px] w-full">
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
			<div className="absolute top-[6px] right-0 bottom-[18px] left-[27px] flex">
				{bars.map((bar, i) => {
					const total = bar.values.reduce((a, b) => a + b, 0);
					const flip = i > bars.length * 0.6;
					return (
						<div
							key={i}
							tabIndex={0}
							aria-label={`${bar.title}: ${bar.lines.join(', ')}`}
							onMouseEnter={() => setActive(i)}
							onMouseLeave={() => setActive(null)}
							onFocus={() => setActive(i)}
							onBlur={() => setActive(null)}
							className="relative flex flex-1 flex-col items-center justify-end rounded outline-none focus-visible:bg-light-blue/40"
						>
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
									role="tooltip"
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
		</div>
	);
}

export interface Point {
	label: string;
	value: number;
	title: string;
	lines: string[];
}

/** A running total as a line on the same axis as BarChart; each column is a hover/focus target with a tooltip. */
export function LineChart({ points, ticks, label }: { points: Point[]; ticks: number[]; label: string }) {
	const [active, setActive] = useState<number | null>(null);
	const max = ticks[ticks.length - 1] || 1;
	const n = Math.max(1, points.length);
	// x as a share of the plot width: the middle of each column, as BarChart places bars
	const x = (i: number) => ((i + 0.5) / n) * 100;
	const y = (v: number) => 100 - (v / max) * 100;
	const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.value)}`).join(' ');

	return (
		<div role="group" aria-label={label} className="relative h-[174px] w-full">
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
			<div className="absolute top-[6px] right-0 bottom-[18px] left-[27px]">
				<svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
					<path d={path} fill="none" className="stroke-dark-blue" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
				</svg>
				<div className="absolute inset-0 flex">
					{points.map((p, i) => (
						<div
							key={i}
							tabIndex={0}
							aria-label={`${p.title}: ${p.lines.join(', ')}`}
							onMouseEnter={() => setActive(i)}
							onMouseLeave={() => setActive(null)}
							onFocus={() => setActive(i)}
							onBlur={() => setActive(null)}
							className="relative flex-1 rounded outline-none focus-visible:bg-light-blue/40"
						>
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
									role="tooltip"
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
		</div>
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
				<div className="h-full bg-med-blue" style={{ width: `${((total - checkedIn) / answered) * 100}%` }} />
			</div>
		</div>
	);
}
