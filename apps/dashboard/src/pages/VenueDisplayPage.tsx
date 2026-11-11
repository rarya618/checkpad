import { checkInStatus, type CheckInStatus } from '@checkpad/shared/events';
import { formatDay, formatTimeRange } from '@checkpad/shared/format';
import logo from '@checkpad/shared/checkpad-logo.svg';
import { Navigate, useParams } from 'react-router';
import QrCode from '../components/QrCode';
import { checkInUrl } from '../lib/config';
import { useEvent } from '../lib/events';

// What the screen asks people to do. The QR code stays up whatever the status, so a display
// opened before self check-in starts is ready the moment an organiser opens it.
const prompts: Record<CheckInStatus, { heading: string; link: string }> = {
	open: { heading: 'Scan to check in', link: 'or go to' },
	'not-open': { heading: 'Check-in opens soon', link: 'Scan or go to' },
	closed: { heading: 'Check-in has closed', link: 'Event link' },
};

// Figma "QR Code screen": the full-screen venue display (old app's &display=qr), opened from
// the Share dialog onto a projector or TV. Side by side on a landscape screen, so the QR code
// can fill most of the height for people at the back; stacked on a portrait screen or phone.
export default function VenueDisplayPage() {
	const { slug } = useParams();
	const event = useEvent(slug);
	if (!event) return <Navigate to="/events" replace />;
	const url = checkInUrl(event.slug);
	const shortUrl = url.replace(/^https?:\/\//, '');
	const prompt = prompts[checkInStatus({ open: event.selfCheckInOpen, startsAt: event.startsAt })];
	const start = new Date(event.startsAt);

	return (
		<main className="flex min-h-dvh flex-col px-6 pt-10 pb-6 lg:px-16 lg:pt-12">
			<div className="mx-auto grid w-full max-w-7xl flex-1 content-center items-center gap-10 lg:grid-cols-2 lg:gap-16">
				<div className="flex flex-col items-center gap-6 text-center lg:items-start lg:gap-8 lg:text-left">
					<div className="flex flex-col items-center gap-3 lg:items-start lg:gap-4">
						<p className="text-lg font-semibold text-med-blue lg:text-xl 2xl:text-2xl">
							{formatDay(start, event.timeZone)} · {formatTimeRange(start, new Date(event.endsAt), event.timeZone)}
						</p>
						<h1 className="font-display text-4xl leading-tight text-balance lg:text-6xl 2xl:text-7xl">{event.name}</h1>
						{event.description && <p className="text-xl leading-snug text-med-blue lg:text-2xl 2xl:text-3xl">{event.description}</p>}
					</div>

					<div aria-hidden="true" className="flex h-2 w-40 overflow-hidden rounded-full">
						<span className="flex-1 bg-dark-blue" />
						<span className="flex-1 bg-med-blue" />
						<span className="flex-1 bg-light-blue" />
					</div>

					<div className="flex flex-col items-center gap-2 lg:items-start">
						<p className="font-display text-3xl leading-tight lg:text-4xl 2xl:text-5xl">{prompt.heading}</p>
						<p className="text-lg text-med-blue lg:text-xl 2xl:text-2xl">
							{prompt.link} <span className="inline-block font-semibold break-all text-dark-blue">{shortUrl}</span>
						</p>
					</div>
				</div>

				<div className="flex justify-center lg:justify-end">
					{/* Sized in CSS, with the height following the width, so the card stays square
					    without depending on its parent's height */}
					<QrCode
						value={url}
						size="100%"
						label={`QR code for ${url}`}
						className="aspect-square h-auto w-[min(70vw,40vh)] shrink-0 rounded-3xl shadow-[0_8px_40px_rgb(17_45_78/0.12)] lg:w-[min(34vw,52vh)]"
					/>
				</div>
			</div>

			<footer className="flex items-center justify-center gap-3 pt-8 text-base text-med-blue lg:text-lg">
				powered by
				<img src={logo} alt="checkpad" width={268} height={64} className="h-7 w-auto lg:h-8" />
			</footer>
		</main>
	);
}
