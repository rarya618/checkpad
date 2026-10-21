import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo.svg';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import gift from '../assets/gift-large.svg';
import x from '../assets/x.svg';
import Dialog from '../components/Dialog';
import { fullName } from '../lib/checkIn';
import Loading from '../components/Loading';
import Toaster from '../components/Toaster';
import { useEvent, type DashboardEvent } from '../lib/events';
import { addWinner, markLatestNotHere, resetDraw, useDraw } from '../lib/prizeDraw';
import { useRoster, useRosterLoading } from '../lib/roster';
import { showToast } from '../lib/toast';

// Figma "Prize draw display – ready / drawing / winner / nobody checked in / everyone has
// won / start over?". Full screen on the venue's projector, names only (no emails or tickets).
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

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-10 p-5 text-center">
			<div className="flex flex-col items-center gap-3 leading-[1.2]">
				<h1 className="font-display text-[clamp(40px,6vh,64px)]">{name}</h1>
				<p className="text-[clamp(24px,3.4vh,36px)] text-med-blue">Prize draw</p>
			</div>

			<section aria-live="polite" className="flex min-h-[min(460px,44vh)] w-full max-w-[1300px] flex-col items-center justify-center gap-5">
				{view === 'drawing' && (
					<>
						<p className="max-w-full truncate font-display text-[clamp(56px,10vh,112px)] leading-[1.2] text-light-blue" aria-hidden="true">
							{spinning || '…'}
						</p>
						<p className="text-[clamp(28px,3.7vh,40px)] leading-[1.2] text-med-blue">Drawing…</p>
					</>
				)}

				{view === 'winner' && latest && (
					<>
						<p className="text-[clamp(24px,3vh,32px)] leading-[1.2] font-semibold text-med-blue">Winner #{draw.winners.length}</p>
						<p className="max-w-full font-display text-[clamp(64px,11.8vh,128px)] leading-[1.2] break-words">{fullName(latest)}</p>
						<div aria-hidden="true" className="flex h-2.5 w-[330px] overflow-hidden rounded-full">
							<span className="flex-1 bg-dark-blue" />
							<span className="flex-1 bg-med-blue" />
							<span className="flex-1 bg-light-blue" />
						</div>
						<p className="text-[clamp(22px,2.6vh,28px)] leading-[1.2] text-med-blue">
							{stillIn} still in the draw
						</p>
						<div className="flex gap-4 pt-3">
							<button
								type="button"
								onClick={() => {
									markLatestNotHere(event, draw).catch(() => showToast('Couldn’t save that. Try again.'));
									drawWinner();
								}}
								disabled={stillIn === 0}
								className={`${buttonClass('secondary', 'lg')} disabled:opacity-50`}
							>
								Not here
							</button>
							<button type="button" onClick={drawWinner} className={buttonClass('primary', 'lg')}>
								Draw again
							</button>
						</div>
						<button type="button" onClick={() => setConfirmStartOver(true)} className="text-lg leading-[1.5] font-semibold text-med-blue underline">
							Start over
						</button>
					</>
				)}

				{view === 'ready' && (
					<>
						<GiftIcon />
						<Count n={stillIn} />
						<p className="text-[clamp(22px,2.6vh,28px)] leading-[1.2] text-med-blue">Everyone who has checked in tonight</p>
						<div className="pt-5">
							<button type="button" onClick={drawWinner} className={buttonClass('primary', 'lg')}>
								Draw a winner
							</button>
						</div>
					</>
				)}

				{view === 'nobody' && (
					<>
						<GiftIcon />
						<Count n={0} />
						<p className="text-[clamp(22px,2.6vh,28px)] leading-[1.2] text-med-blue">Check people in first. The draw uses everyone who has arrived.</p>
						<div className="pt-5">
							<button type="button" disabled className={`${buttonClass('primary', 'lg')} disabled:opacity-50`}>
								Draw a winner
							</button>
						</div>
					</>
				)}

				{view === 'everyone-won' && (
					<>
						<GiftIcon />
						<p className="font-display text-[clamp(32px,3.7vh,40px)] leading-[1.2]">Everyone here has won</p>
						<p className="text-[clamp(22px,2.6vh,28px)] leading-[1.2] text-med-blue">
							Start over to put all {checkedIn.length} people back in the draw.
						</p>
						<div className="pt-5">
							<button type="button" onClick={() => setConfirmStartOver(true)} className={buttonClass('primary', 'lg')}>
								Start over
							</button>
						</div>
					</>
				)}
			</section>

			<div className="flex flex-col items-center gap-2">
				<p className="text-[clamp(22px,3vh,32px)] leading-[1.2] font-light text-med-blue">powered by</p>
				<img src={logo} alt="checkpad" width={268} height={64} />
			</div>

			{confirmStartOver && (
				<Dialog
					size="lg"
					title="Start the draw over?"
					description={`${draw.winners.length === 1 ? 'The winner goes' : `All ${draw.winners.length} winners go`} back into the draw, along with anyone marked not here.`}
					onClose={() => setConfirmStartOver(false)}
					className="w-[600px] text-left"
					closeButton={
						<button type="button" aria-label="Close" onClick={() => setConfirmStartOver(false)} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
							<img src={x} alt="" width={24} height={24} />
						</button>
					}
				>
					<div className="flex justify-end gap-4">
						<button type="button" onClick={() => setConfirmStartOver(false)} className={buttonClass('secondary', 'lg')}>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => {
								resetDraw(event).catch(() => showToast('Couldn’t start over. Try again.'));
								setShowWinner(true);
								setConfirmStartOver(false);
							}}
							className={buttonClass('primary', 'lg')}
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

function GiftIcon() {
	return (
		<span className="flex size-28 items-center justify-center rounded-full bg-light-blue">
			<img src={gift} alt="" width={48} height={48} />
		</span>
	);
}

function Count({ n }: { n: number }) {
	return (
		<p className="flex items-baseline gap-5 leading-[1.2]">
			<span className="font-display text-[clamp(64px,9vh,96px)]">{n}</span>
			<span className="text-[clamp(28px,3.7vh,40px)] text-med-blue">{n === 1 ? 'person' : 'people'} in the draw</span>
		</p>
	);
}
