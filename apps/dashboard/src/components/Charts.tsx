import { useState } from 'react';

// Analytics building blocks at the dashboard's 75% scale: Figma "Stat tile" and the bar
// charts in "Event analytics" and "Analytics".

export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-xl border border-med-blue bg-white px-[18px] py-[15px] md:px-[21px] md:py-[18px]">
			<p className="truncate text-[13.5px] leading-[1.5] text-med-blue">{label}</p>
			<p className="font-display text-4xl leading-[1.2]">{value}</p>
			{note && <p className="truncate text-xs leading-[1.5] text-med-blue">{note}</p>}
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
		<ul className="flex shrink-0 items-center gap-[15px]">
			{series.map((s) => (
				<li key={s.name} className="flex items-center gap-1.5 text-xs leading-[1.5]">
					<span aria-hidden="true" className={`size-[9px] rounded-[2.25px] ${s.className}`} />
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
						<p className="absolute left-0 w-[20px] -translate-y-1/2 text-right text-[10.5px] leading-[1.5] text-med-blue" style={{ top: y }}>
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
							{bar.showValue && total > 0 && (
								<p className="mb-[3px] text-xs leading-[1.5] font-bold" aria-hidden="true">
									{bar.showValue}
								</p>
							)}
							{/* Segments bottom up, a 1.5px surface gap between them; only the top one is rounded */}
							<div className="flex w-[18px] flex-col-reverse gap-[1.5px]" style={{ height: `${(total / max) * 100}%` }}>
								{bar.values.map((v, s) =>
									v > 0 ? (
										<div
											key={s}
											className={`${series[s].className} ${bar.values.slice(s + 1).every((n) => n === 0) ? 'rounded-t-[3px]' : ''}`}
											style={{ flexGrow: v, flexBasis: 0 }}
										/>
									) : null,
								)}
							</div>
							{bar.label && (
								<p className="absolute top-full mt-[3px] text-[10.5px] leading-[1.5] whitespace-nowrap text-med-blue" aria-hidden="true">
									{bar.label}
								</p>
							)}
							{active === i && (
								<div
									role="tooltip"
									className={`pointer-events-none absolute z-10 flex flex-col gap-[3px] rounded-[7.5px] border border-med-blue bg-white py-[9px] pr-3 pl-[10.5px] text-left whitespace-nowrap shadow-[0_4.5px_12px_rgb(17_45_78/0.14)] ${
										flip ? 'right-[calc(50%+15px)]' : 'left-[calc(50%+15px)]'
									}`}
									style={{ bottom: `${Math.min(80, (total / max) * 100)}%` }}
								>
									<p className="text-xs leading-[1.5] font-bold">{bar.title}</p>
									{bar.lines.map((line, s) => (
										<p key={s} className="flex items-center gap-1.5 text-[11.25px] leading-[1.5]">
											{series[s] && <span aria-hidden="true" className={`size-[7.5px] rounded-[1.5px] ${series[s].className}`} />}
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
