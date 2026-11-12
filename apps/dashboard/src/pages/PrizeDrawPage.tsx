import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo-light.svg';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import x from '../assets/x.svg';
import Dialog from '../components/Dialog';
import { fullName } from '../lib/checkIn';
import Loading from '../components/Loading';
import Toaster from '../components/Toaster';
import { useEvent, type DashboardEvent } from '../lib/events';
import { addWinner, markLatestNotHere, resetDraw, useDraw } from '../lib/prizeDraw';
import { useRoster, useRosterLoading } from '../lib/roster';
import { showToast } from '../lib/toast';

// The prize draw display: ready, drawing, winner, nobody checked in, everyone has won, start
// over?. Redesigned dark for the projector on 12 November 2026, so it no longer follows the
// Figma frames. Full screen on the venue's projector, names only (no emails or tickets).
export default function PrizeDrawPage() {
	const { slug } = useParams();
	const event = useEvent(slug);
	const roster = useRosterLoading(slug ?? '');
	if (!event) return <Navigate to="/events" replace />;
	if (!roster) return <Loading />;
	return <PrizeDraw event={event} />;
}

function PrizeDraw({ event }: { event: DashboardEvent }) {
	const { slug, name } = event;
	const roster = useRoster(slug);
	const draw = useDraw(slug);
	const checkedIn = useMemo(() => roster.filter((a) => a.checkedInAt), [roster]);
	const pool = useMemo(() => checkedIn.filter((a) => !draw.winners.includes(a.id) && !draw.notHere.includes(a.id)), [checkedIn, draw]);
	const latest = roster.find((a) => a.id === draw.winners[draw.winners.length - 1]);

	// The name flicking past while drawing; null when not drawing.
	const [spinning, setSpinning] = useState<string | null>(null);
	// After the pool runs out, Draw again shows "Everyone here has won" instead of the last winner
	const [showWinner, setShowWinner] = useState(true);
	const [confirmStartOver, setConfirmStartOver] = useState(false);
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
	useEffect(() => () => timers.current.forEach(clearTimeout), []);

	function drawWinner() {
		if (pool.length === 0) {
			setShowWinner(false);
			return;
		}
		const winner = pool[crypto.getRandomValues(new Uint32Array(1))[0] % pool.length];
		const reveal = () => {
			setSpinning(null);
			setShowWinner(true);
			addWinner(event, draw, winner.id).catch(() => showToast('Couldn’t save the winner. Check the connection and draw again.'));
		};
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setSpinning('');
			timers.current.push(setTimeout(reveal, 600));
			return;
		}
		// Flick through names, slowing down: about 2.2s, then a beat before the reveal
		let t = 0;
		for (let step = 0; step < 22; step++) {
			t += 40 + step * step * 0.4;
			const shown = step === 21 ? winner : pool[Math.floor(Math.random() * pool.length)];
			timers.current.push(setTimeout(() => setSpinning(fullName(shown)), t));
		}
		timers.current.push(setTimeout(reveal, t + 450));
		setSpinning(fullName(pool[Math.floor(Math.random() * pool.length)]));
	}

	const view =
		spinning !== null
			? 'drawing'
			: checkedIn.length === 0
				? 'nobody'
				: latest && showWinner
					? 'winner'
					: pool.length === 0 && draw.winners.length > 0
						? 'everyone-won'
						: 'ready';
	const stillIn = pool.length;
	const startOverLink = (
		<button type="button" onClick={() => setConfirmStartOver(true)} className="text-base font-semibold text-light-blue underline hover:text-off-white">
			Start over
		</button>
	);

	return (
		// The venue's projector: dark, so it holds up in a lit room. The audience sees one thing
		// in the middle; the event name sits small at the top and the organiser's controls at the bottom.
		<main className="flex min-h-dvh flex-col gap-8 bg-dark-blue p-8 text-off-white md:p-12">
			<header className="flex flex-col gap-1">
				<h1 className="font-display text-3xl md:text-4xl">{name}</h1>
				<p className="text-xl text-light-blue md:text-2xl">Prize draw</p>
			</header>

			<section aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
				{view === 'drawing' && (
					<p className="max-w-full truncate font-display text-7xl text-med-blue md:text-9xl" aria-hidden="true">
						{spinning || '…'}
					</p>
				)}

				{view === 'winner' && latest && (
					// Keyed by winner, so each new one plays the reveal
					<div key={latest.id} className="flex max-w-full flex-col items-center gap-4 motion-safe:animate-winner-in">
						<p className="text-2xl font-semibold text-light-blue md:text-3xl">Winner #{draw.winners.length}</p>
						<p className={`max-w-full font-display break-words ${fullName(latest).length > 18 ? 'text-6xl md:text-8xl' : 'text-7xl md:text-9xl'}`}>
							{fullName(latest)}
						</p>
					</div>
				)}

				{(view === 'ready' || view === 'nobody') && (
					<>
						<p className="flex flex-wrap items-baseline justify-center gap-x-6">
							<span className="font-display text-8xl md:text-9xl">{stillIn}</span>
							<span className="text-3xl text-light-blue md:text-5xl">{stillIn === 1 ? 'person' : 'people'} in the draw</span>
						</p>
						<p className="text-xl text-light-blue md:text-2xl">
							{view === 'ready' ? 'Everyone who has checked in' : 'Check people in first. The draw uses everyone who has arrived.'}
						</p>
					</>
				)}

				{view === 'everyone-won' && (
					<>
						<p className="font-display text-5xl md:text-7xl">Everyone here has won</p>
						<p className="text-xl text-light-blue md:text-2xl">Start over to put all {checkedIn.length} people back in the draw.</p>
					</>
				)}
			</section>

			<footer className="flex flex-wrap items-end justify-between gap-6">
				<div className="flex flex-col gap-3">
					<p className="min-h-7 text-lg text-light-blue md:text-xl">
						{view === 'drawing' ? 'Drawing…' : view === 'winner' ? `${stillIn} still in the draw` : ''}
					</p>
					{/* The organiser's controls; the row keeps its height while drawing so nothing jumps */}
					<div className="flex min-h-9 flex-wrap items-center gap-3">
						{(view === 'ready' || view === 'nobody') && (
							<button type="button" onClick={drawWinner} disabled={view === 'nobody'} className={`${buttonClass('accent')} disabled:opacity-50`}>
								Draw a winner
							</button>
						)}
						{view === 'winner' && (
							<>
								<button
									type="button"
									onClick={() => {
										markLatestNotHere(event, draw).catch(() => showToast('Couldn’t save that. Try again.'));
										drawWinner();
									}}
									disabled={stillIn === 0}
									className={`${buttonClass('secondary')} disabled:opacity-50`}
								>
									Not here
								</button>
								<button type="button" onClick={drawWinner} className={buttonClass('accent')}>
									Draw again
								</button>
								<span className="pl-1">{startOverLink}</span>
							</>
						)}
						{view === 'everyone-won' && (
							<button type="button" onClick={() => setConfirmStartOver(true)} className={buttonClass('accent')}>
								Start over
							</button>
						)}
					</div>
				</div>
				<div className="flex items-center gap-3">
					<p className="text-lg text-light-blue">powered by</p>
					<img src={logo} alt="checkpad" width={134} height={32} />
				</div>
			</footer>

			{confirmStartOver && (
				<Dialog
					title="Start the draw over?"
					description={`${draw.winners.length === 1 ? 'The winner goes' : `All ${draw.winners.length} winners go`} back into the draw, along with anyone marked not here.`}
					onClose={() => setConfirmStartOver(false)}
					className="w-[450px] text-left"
					closeButton={
						<button type="button" aria-label="Close" onClick={() => setConfirmStartOver(false)} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
							<img src={x} alt="" width={18} height={18} />
						</button>
					}
				>
					<div className="flex justify-end gap-3">
						<button type="button" onClick={() => setConfirmStartOver(false)} className={buttonClass('secondary')}>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => {
								resetDraw(event).catch(() => showToast('Couldn’t start over. Try again.'));
								setShowWinner(true);
								setConfirmStartOver(false);
							}}
							className={buttonClass('primary')}
						>
							Start over
						</button>
					</div>
				</Dialog>
			)}
			{/* Only shows if saving a result fails */}
			<div className="fixed inset-x-0 bottom-0">
				<Toaster />
			</div>
		</main>
	);
}
