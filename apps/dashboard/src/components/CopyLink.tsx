import { useEffect, useState } from 'react';
import tick from '../assets/check-blue.svg';
import copyLink from '../assets/copy-link.svg';

// Beside a link in a line of text (the event header's check-in link, a team's link on Organisers)
/** Copies the link: a small icon beside it that turns to a tick for a moment. */
export default function CopyLink({ url, label = 'Copy link' }: { url: string; /** What it copies, for screen readers: "Copy check-in link". */ label?: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);
	return (
		<button
			type="button"
			aria-label={copied ? 'Copied' : label}
			title={copied ? 'Copied' : 'Copy link'}
			onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
			className="flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-light-blue/60"
		>
			<img src={copied ? tick : copyLink} alt="" width={15} height={15} />
		</button>
	);
}
