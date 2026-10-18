import logo from '@checkpad/shared/checkpad-logo.svg';
import { Navigate, useParams } from 'react-router';
import QrCode from '../components/QrCode';
import { checkInUrl } from '../lib/config';
import { useEvent } from '../lib/events';

// Figma "QR Code screen": the full-screen venue display (old app's &display=qr), opened from
// the Share dialog onto a projector or TV. Full size, shrinking with the window height.
export default function VenueDisplayPage() {
	const { slug } = useParams();
	const event = useEvent(slug);
	if (!event) return <Navigate to="/events" replace />;
	const url = checkInUrl(event.slug);

	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-10 p-5 text-center">
			<div className="flex flex-col items-center gap-3 leading-[1.2]">
				<h1 className="font-display text-[clamp(40px,6vh,64px)]">{event.name}</h1>
				<p className="text-[clamp(24px,3.4vh,36px)] text-med-blue">{event.description}</p>
			</div>
			<QrCode value={url} size="min(420px, 42vh)" label={`QR code for ${url}`} className="rounded-xl" />
			<div className="flex flex-col items-center gap-2">
				<p className="text-[clamp(22px,3vh,32px)] leading-[1.2] font-light text-med-blue">powered by</p>
				<img src={logo} alt="checkpad" width={268} height={64} />
			</div>
		</main>
	);
}
