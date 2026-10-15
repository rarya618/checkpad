import logo from '@checkpad/shared/checkpad-logo.svg';

// Placeholder until the Figma "Events Dashboard" and "Attendees Dashboard" are built.
export default function App() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-off-white font-sans text-dark-blue antialiased">
			<img src={logo} alt="checkpad" width={176} height={42} />
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="font-display text-[40px]">Organiser dashboard</h1>
				<p className="text-2xl text-med-blue">Coming soon</p>
			</div>
		</main>
	);
}
