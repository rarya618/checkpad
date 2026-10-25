import { buttonClass } from '@checkpad/shared/button';
import { formatDate } from '@checkpad/shared/format';
import { useState } from 'react';
import mail from '../assets/mail.svg';
import more from '../assets/more.svg';
import trash from '../assets/trash.svg';
import Menu from '../components/Menu';
import { AddOrganiserDialog } from '../components/OrganiserDialogs';
import PageHeader from '../components/PageHeader';
import { downloadCsv } from '../lib/csv';
import { isOrganiser, useMe, useOrganisers } from '../lib/organisers';
import { showToast } from '../lib/toast';
import { removeFromWaitlist, useWaitlist, type WaitlistSignup } from '../lib/waitlist';

// The marketing site's waitlist (not in Figma), one row per email, newest first. Super admins
// only: App.tsx sends anyone else to Events, and the rules refuse them (firestore.rules).
export default function WaitlistPage() {
	const [inviting, setInviting] = useState<string | null>(null);
	return (
		<>
			<PageHeader title="Waitlist" actions={<WaitlistDownload />} />
			<div className="flex flex-col gap-[21px] px-6 pb-[27px]">
				<WaitlistTable onInvite={setInviting} />
			</div>
			{inviting && <AddOrganiserDialog email={inviting} onClose={() => setInviting(null)} />}
		</>
	);
}

const SYDNEY = 'Australia/Sydney';

function WaitlistDownload() {
	const waitlist = useWaitlist().signups;
	return (
		<button
			type="button"
			disabled={!waitlist?.length}
			onClick={() => downloadCsv('checkpad-waitlist.csv', [['Email', 'Signed up'], ...waitlist!.map((s) => [s.email, s.signedUpAt])])}
			className={`${buttonClass('primary')} disabled:opacity-50`}
		>
			Download CSV
		</button>
	);
}

function WaitlistTable({ onInvite }: { onInvite: (email: string) => void }) {
	const { signups: waitlist, error } = useWaitlist();
	const organisers = useOrganisers(useMe()) ?? [];
	if (error) {
		return (
			<div role="alert" className="flex flex-col items-start gap-3 rounded-[15px] bg-white px-[22.5px] py-[18px] text-[15px] leading-[1.5]">
				<p>Couldn’t load the waitlist. Check the connection and reload. The rest of the dashboard still works.</p>
				<button type="button" onClick={() => location.reload()} className={buttonClass('secondary', 'sm')}>
					Reload
				</button>
			</div>
		);
	}
	if (!waitlist) return null;
	if (!waitlist.length) return <p className="text-[15px] leading-[1.5] text-med-blue">Nobody’s on the waitlist yet.</p>;
	return (
		<>
			<div className="rounded-[15px] bg-white px-[22.5px] py-[18px]">
				<table className="w-full table-fixed">
					<colgroup>
						<col />
						<col className="w-[280px]" />
						<col className="w-[30px]" />
					</colgroup>
					<thead>
						<tr className="text-left font-display text-[15px] leading-[1.5] text-black">
							<th className="pr-[18px] pb-1.5">Email</th>
							<th className="pr-[18px] pb-1.5">Signed up</th>
							<th className="pb-1.5">
								<span className="sr-only">Options</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{waitlist.map((s) => (
							<tr key={s.email} className="text-[15px] leading-[1.5] text-black">
								<td className="truncate py-[7.5px] pr-[18px]">
									{s.email}
									{isOrganiser(organisers, s.email) && <span className="text-med-blue"> · organiser</span>}
								</td>
								<td className="py-[7.5px] pr-[18px] whitespace-nowrap">
									{formatDate(new Date(s.signedUpAt), SYDNEY)}
									{s.entryIds.length > 1 && <span className="text-med-blue"> · {s.entryIds.length} times</span>}
								</td>
								<td className="py-[7.5px]">
									<WaitlistMenu signup={s} invited={isOrganiser(organisers, s.email)} onInvite={onInvite} />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="text-[13.5px] leading-[1.5] text-med-blue">
				{waitlist.length} {waitlist.length === 1 ? 'person' : 'people'} from the sign-up form on the Checkpad site. Inviting someone doesn’t take them off the list.
			</p>
		</>
	);
}

function WaitlistMenu({ signup, invited, onInvite }: { signup: WaitlistSignup; invited: boolean; onInvite: (email: string) => void }) {
	return (
		<Menu
			label={`Options for ${signup.email}`}
			buttonClassName="rounded-md p-1 hover:bg-light-blue/60"
			items={[
				{ label: 'Invite as organiser', icon: mail, disabled: invited, onSelect: () => onInvite(signup.email) },
				{
					label: 'Remove from waitlist',
					icon: trash,
					separated: true,
					onSelect: () => removeFromWaitlist(signup).catch(() => showToast(`Couldn’t remove ${signup.email}. Try again.`)),
				},
			]}
		>
			<img src={more} alt="" width={18} height={18} />
		</Menu>
	);
}
