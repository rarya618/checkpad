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
import { useMe, useOrganisers } from '../lib/organisers';
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
				{/* Laid out like the Organisers table: avatar and two lines per person, status as a pill */}
				<table className="w-full table-fixed">
					<colgroup>
						<col />
						<col className="w-[183px]" />
						<col className="w-[30px]" />
					</colgroup>
					<thead>
						<tr className="text-left font-display text-[15px] leading-[1.5] text-black">
							<th className="pr-[18px] pb-1.5">Person</th>
							<th className="pr-[18px] pb-1.5">Status</th>
							<th className="pb-1.5">
								<span className="sr-only">Options</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{waitlist.map((s) => {
							const organiser = organisers.find((o) => o.email === s.email.trim().toLowerCase());
							return (
								<tr key={s.email}>
									<td className="py-[7.5px] pr-[18px]">
										<div className="flex items-center gap-3">
											<span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-light-blue font-display text-[15px]">
												{s.email.slice(0, 2).toUpperCase()}
											</span>
											<div className="flex min-w-0 flex-col gap-0.5 leading-[1.5]">
												<p className="truncate font-display text-lg leading-[1.2] text-black">{s.email}</p>
												<p className="truncate text-[13.5px] text-med-blue">
													Signed up {formatDate(new Date(s.signedUpAt), SYDNEY)}
													{s.entryIds.length > 1 && ` · ${s.entryIds.length} times`}
												</p>
											</div>
										</div>
									</td>
									<td className="py-[7.5px] pr-[18px]">
										<span
											className={`inline-block rounded-full px-[10.5px] py-[4.5px] text-xs leading-[1.5] font-bold whitespace-nowrap ${
												organiser ? 'bg-dark-blue text-white' : 'bg-light-blue text-dark-blue'
											}`}
										>
											{!organiser ? 'Waiting' : organiser.invited ? 'Invited' : 'Organiser'}
										</span>
									</td>
									<td className="py-[7.5px]">
										<WaitlistMenu signup={s} invited={!!organiser} onInvite={onInvite} />
									</td>
								</tr>
							);
						})}
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
