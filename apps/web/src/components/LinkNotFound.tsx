import StatusScreen from './StatusScreen';

// Figma "Link not found (mobile-first)": mistyped links, deleted events and unknown teams.
export default function LinkNotFound() {
	return (
		<StatusScreen
			title="Link not found"
			subtitle="This check-in link doesn’t match any event."
			body="Check the link with your organiser."
			homeLink={false}
		/>
	);
}
