import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useState } from 'react';
import check from '../assets/check.svg';

function Spinner() {
	const circumference = 2 * Math.PI * 9;
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="animate-spin text-med-blue">
			<circle cx="10" cy="10" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
			<circle
				cx="10"
				cy="10"
				r="9"
				stroke="currentColor"
				strokeWidth="2"
				strokeDasharray={`${circumference * 0.375} ${circumference}`}
				transform="rotate(-90 10 10)"
			/>
		</svg>
	);
}

// While a page loads. The spinner matches apps/web's.
export default function Loading() {
	return (
		<main aria-busy="true" className="flex min-h-dvh items-center justify-center">
			<Spinner />
			<span className="sr-only">Loading</span>
		</main>
	);
}

export interface LoadingStep {
	label: string;
	done: boolean;
}

/** How long one step can take before the page says so and offers a reload. */
const SLOW_MS = 10_000;

/**
 * Not in Figma: opening the dashboard, step by step, so a load that hangs (it has in Safari)
 * shows where. Fades in after a moment, so a quick load only shows the spinner. A step that
 * takes too long is logged and offers a reload.
 */
export function LoadingSteps({ steps }: { steps: LoadingStep[] }) {
	const current = steps.find((s) => !s.done);
	const [slow, setSlow] = useState<string | null>(null);
	useEffect(() => {
		if (!current) return;
		const t = setTimeout(() => {
			setSlow(current.label);
			console.warn(`Dashboard still loading after ${SLOW_MS / 1000}s at "${current.label}"`, {
				done: steps.filter((s) => s.done).map((s) => s.label),
				userAgent: navigator.userAgent,
			});
		}, SLOW_MS);
		return () => clearTimeout(t);
		// Restarts for each step, not each render
	}, [current?.label]);
	const stuck = slow !== null && slow === current?.label;

	return (
		<main aria-busy="true" className="flex min-h-dvh items-center justify-center p-6">
			<div className="flex w-full max-w-[260px] flex-col items-center gap-[30px] animate-loading-in">
				<img src={logo} alt="checkpad" width={132} height={31.5} />
				<ol className="flex w-full flex-col gap-3" aria-live="polite">
					{steps.map((step) => {
						const active = step === current;
						return (
							<li
								key={step.label}
								className={`flex items-center gap-[10.5px] text-[15px] leading-[1.5] transition-colors ${
									step.done ? 'text-med-blue' : active ? 'font-semibold text-dark-blue' : 'text-med-blue/50'
								}`}
							>
								<span className="flex size-5 shrink-0 items-center justify-center">
									{step.done ? (
										<span className="flex size-5 items-center justify-center rounded-full bg-dark-blue">
											<img src={check} alt="" width={12} height={12} />
										</span>
									) : active ? (
										<Spinner />
									) : (
										<span className="size-5 rounded-full border-2 border-light-blue" />
									)}
								</span>
								{step.label}
								<span className="sr-only">{step.done ? ', done' : active ? ', in progress' : ''}</span>
							</li>
						);
					})}
				</ol>
				{stuck && (
					<div className="flex w-full flex-col gap-3 animate-loading-in">
						<p role="alert" className="text-[13.5px] leading-[1.5] text-med-blue">
							This is taking longer than usual. Check your connection and reload. If it keeps happening, close other Checkpad tabs.
						</p>
						<button type="button" onClick={() => location.reload()} className={`w-full ${buttonClass('primary')}`}>
							Reload
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
