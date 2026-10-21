// While sign-in and the organiser list load. The spinner matches apps/web's.
export default function Loading() {
	const circumference = 2 * Math.PI * 9;
	return (
		<main aria-busy="true" className="flex min-h-dvh items-center justify-center text-med-blue">
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="animate-spin">
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
			<span className="sr-only">Loading</span>
		</main>
	);
}
