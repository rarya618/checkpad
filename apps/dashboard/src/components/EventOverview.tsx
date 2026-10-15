import { buttonClass } from '@checkpad/shared/button';
import type { CheckpadEvent } from '@checkpad/shared/events';
import { formatDate, formatTimeRange } from '@checkpad/shared/format';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import clipboard from '../assets/clipboard.svg';
import ellipsis from '../assets/ellipsis-vertical-dark.svg';
import { checkInUrl } from '../lib/config';

// Top of the Attendees dashboard: breadcrumbs, event name, date, check-in link, actions.
export default function EventOverview({ event }: { event: CheckpadEvent }) {
	const start = new Date(event.startsAt);
	const end = new Date(event.endsAt);
	return (
		<section className="flex items-center gap-3 px-6 pt-[54px]">
			<div className="flex min-w-0 flex-1 flex-col gap-3.5 py-px">
				<nav aria-label="Breadcrumb">
					<ol className="flex items-center gap-1.5 text-[15px] text-black">
						<li>
							<Link to="/events" className="tracking-[-0.375px] hover:underline">
								Events
							</Link>
						</li>
						<li aria-hidden="true">/</li>
						<li aria-current="page" className="font-display">
							{event.name}
						</li>
					</ol>
				</nav>
				<div className="flex flex-col gap-[4.5px]">
					<h1 className="font-display text-3xl">{event.name}</h1>
					<p className="text-[15px] font-semibold tracking-[-0.375px] text-black">
						{formatDate(start, event.timeZone)}, {formatTimeRange(start, end, event.timeZone)}
					</p>
				</div>
				<CheckInLink url={checkInUrl(event.slug)} />
			</div>
			{/* Edit, Share and the options menu aren't designed yet */}
			<div className="flex shrink-0 items-center gap-[15px]">
				<button type="button" className={buttonClass('secondary')}>
					Edit
				</button>
				<button type="button" className={buttonClass('primary')}>
					Share
				</button>
				<button type="button" aria-label="More event options" className="rounded-[10px] bg-light-blue p-3">
					<img src={ellipsis} alt="" width={18} height={18} />
				</button>
			</div>
		</section>
	);
}

function CheckInLink({ url }: { url: string }) {
	const [copied, setCopied] = useState(false);
	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	return (
		<div className="flex items-center gap-[9px]">
			<a
				href={url}
				target="_blank"
				rel="noreferrer"
				className="truncate text-[15px] font-semibold tracking-[-0.375px] text-med-blue underline"
			>
				{url.replace(/^https?:\/\//, '')}
			</a>
			<button
				type="button"
				aria-label="Copy check-in link"
				onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))}
				className="shrink-0 rounded p-0.5 hover:bg-light-blue/60"
			>
				<img src={clipboard} alt="" className="h-[20.6px] w-[12.9px]" />
			</button>
			{/* Not in the design: brief confirmation after copying */}
			<span role="status" className="text-xs text-med-blue">
				{copied ? 'Copied' : ''}
			</span>
		</div>
	);
}
