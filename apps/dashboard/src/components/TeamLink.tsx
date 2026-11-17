import { formatDate } from '@checkpad/shared/format';
import { WEB_URL } from '../lib/config';
import { useEvents, type DashboardEvent } from '../lib/events';
import type { Team } from '../lib/teams';
import CopyLink from './CopyLink';
import StatusBadge from './StatusBadge';
import MiddleTruncate from './MiddleTruncate';

// A team's permanent link (Organisers' team panel, the Profile page)
/** The event a team link opens: the one open for check-in, else the next upcoming one. */
function teamLinkTarget(team: Team, events: DashboardEvent[]) {
	const own = events.filter((e) => e.teamIds.includes(team.id));
	const now = Date.now();
	return (
		own.find((e) => e.selfCheckInOpen) ??
		own.filter((e) => new Date(e.endsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
	);
}

// The team's permanent link with a copy icon, and the event it opens today, in one quiet line
// (two when the panel is narrow). What the link is for rides in its tooltip and description.
export default function TeamLink({ team }: { team: Team }) {
	const target = teamLinkTarget(team, useEvents());
	const url = `${WEB_URL.replace(/\/$/, '')}/team/${team.slug}`;
	const about = 'For printed signs: it opens whichever event is open for check-in, or else the next one, so a sign printed once keeps working.';
	return (
		<div className="flex min-w-0 flex-col items-start gap-1 text-sm leading-normal text-med-blue @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-2">
			<span className="flex min-w-0 max-w-full items-center gap-2">
				<span className="shrink-0">Team link</span>
				<a href={url} target="_blank" rel="noreferrer" title={about} aria-describedby={`team-link-about-${team.id}`} className="flex min-w-0 underline underline-offset-2 hover:text-dark-blue">
					<MiddleTruncate text={url.replace(/^https?:\/\//, '')} className="underline underline-offset-2" />
				</a>
				<span id={`team-link-about-${team.id}`} className="sr-only">
					{about}
				</span>
				<CopyLink url={url} label="Copy team link" />
			</span>
			{target ? (
				<span className="flex min-w-0 flex-wrap items-center gap-x-2">
					<span>opens</span>
					<span className="font-semibold text-dark-blue">{target.name}</span>
					<span aria-hidden="true">·</span>
					<span className="whitespace-nowrap">{formatDate(new Date(target.startsAt), target.timeZone)}</span>
					{/* The separator stays with the status, and a narrow panel, where the status wraps
					    to a line of its own, drops it */}
					<span className="flex items-center gap-2 whitespace-nowrap">
						<span aria-hidden="true" className="hidden @sm:inline">
							·
						</span>
						<StatusBadge open={target.selfCheckInOpen} />
					</span>
				</span>
			) : (
				<span>No upcoming event to open</span>
			)}
		</div>
	);
}
