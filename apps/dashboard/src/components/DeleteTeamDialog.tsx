import { buttonClass } from '@checkpad/shared/button';
import x from '../assets/x.svg';
import { WEB_HOST } from '../lib/config';
import { useEvents } from '../lib/events';
import { useMe, useOrganisers } from '../lib/organisers';
import { deleteTeam, type Team } from '../lib/teams';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

// Delete team (not in Figma), from Manage team. Only a team no event or organiser uses can go;
// the API checks again (functions/src/teams.ts), in case this page hasn't caught up.
export default function DeleteTeamDialog({ team, onClose }: { team: Team; onClose: () => void }) {
	const events = useEvents().filter((e) => e.teamId === team.id).length;
	const members = (useOrganisers(useMe()) ?? []).filter((o) => o.teamId === team.id).length;
	const inUse = events > 0 || members > 0;
	const uses = [events && count(events, 'event'), members && count(members, 'member')].filter(Boolean).join(' and ');

	return (
		<Dialog
			title={inUse ? `${team.name} can’t be deleted yet` : `Delete ${team.name}?`}
			description={
				inUse
					? `It still has ${uses}. Move its events to another team and remove its members first.`
					: `Printed signs that use ${WEB_HOST}/team/${team.slug} will stop working. It can’t be undone.`
			}
			onClose={onClose}
			className="w-[450px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					if (inUse) return onClose();
					deleteTeam(team).then((error) => showToast(error ?? `${team.name} deleted`));
					onClose();
				}}
			>
				<div className="flex justify-end gap-3">
					{inUse ? (
						<button type="submit" className={buttonClass('primary')}>
							OK
						</button>
					) : (
						<>
							<button type="button" onClick={onClose} className={buttonClass('secondary')}>
								Cancel
							</button>
							<button type="submit" className={buttonClass('primary')}>
								Delete team
							</button>
						</>
					)}
				</div>
			</form>
		</Dialog>
	);
}
