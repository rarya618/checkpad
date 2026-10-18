import QRCode from 'qrcode';
import { useMemo } from 'react';

// The check-in link as a QR code: black modules on white with a quiet zone, drawn as one
// SVG path so it stays sharp on a projector. The Figma QR images are placeholders.
export default function QrCode({ value, size, label, className = '' }: { value: string; size: number | string; label: string; className?: string }) {
	const { path, count } = useMemo(() => {
		const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
		const quiet = 4;
		let d = '';
		for (let y = 0; y < modules.size; y++) {
			for (let x = 0; x < modules.size; x++) {
				if (modules.get(x, y)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
			}
		}
		return { path: d, count: modules.size + quiet * 2 };
	}, [value]);

	return (
		<svg
			role="img"
			aria-label={label}
			viewBox={`0 0 ${count} ${count}`}
			width={size}
			height={size}
			shapeRendering="crispEdges"
			className={`bg-white ${className}`}
		>
			<path d={path} fill="#000" />
		</svg>
	);
}

/** Saves the QR code as a 1024px PNG, for printing on signs. */
export async function downloadQrCode(value: string, filename: string) {
	const url = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', width: 1024, margin: 4 });
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
}
