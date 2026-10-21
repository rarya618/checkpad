import StatusScreen from './StatusScreen';

// Not in Figma. Shown when the API can't be reached as the page loads; the page itself
// comes from Hosting's cache, so it can still say what to do.
export default function LoadFailed() {
	return (
		<StatusScreen
			title="Can’t load check-in"
			subtitle="Check your connection and open this link again."
			body="If it still won’t load, find one of the organisers and they’ll check you in."
			homeLink={false}
		/>
	);
}
