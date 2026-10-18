import { buttonClass } from '@checkpad/shared/button';
import copy from '../assets/copy.svg';
import x from '../assets/x.svg';
import { checkInUrl } from '../lib/config';
import type { DashboardEvent } from '../lib/events';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';
import QrCode, { downloadQrCode } from './QrCode';

// Figma "Attendees – share" at 75% scale.
export default function ShareDialog({ event, onClose }: { event: DashboardEvent; onClose: () => void }) {
	const url = checkInUrl(event.slug);
	const copyLink = () => navigator.clipboard.writeText(url).then(() => showToast('Check-in link copied'));

	return (
		<Dialog
			title="Share check-in"
			description="Attendees scan the code or open the link to check themselves in."
			onClose={onClose}
			className="w-[615px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<div className="flex items-center gap-[21px]">
				<QrCode value={url} size={215} label={`QR code for ${url}`} className="shrink-0 rounded-[6px] border border-light-blue" />
				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<div className="flex items-center gap-[9px] rounded-[7.5px] bg-off-white px-[15px] py-3">
						<p className="min-w-0 flex-1 truncate text-[13.5px] leading-[1.5] text-black">{url.replace(/^https?:\/\//, '')}</p>
						<button type="button" aria-label="Copy check-in link" onClick={copyLink} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
							<img src={copy} alt="" width={18} height={18} />
						</button>
					</div>
					<button type="button" onClick={copyLink} className={`w-full ${buttonClass('primary')}`} data-autofocus>
						Copy link
					</button>
					<button type="button" onClick={() => downloadQrCode(url, `${event.slug}-qr.png`)} className={`w-full ${buttonClass('secondary')}`}>
						Download QR code
					</button>
					<a href={`/events/${event.slug}/display`} target="_blank" rel="noreferrer" className={`w-full ${buttonClass('secondary')}`}>
						Open venue display
					</a>
				</div>
			</div>
		</Dialog>
	);
}
