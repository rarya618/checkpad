import { buttonClass } from '@checkpad/shared/button';
import { useRef, useState } from 'react';
import alert from '../assets/alert.svg';
import fileIcon from '../assets/file.svg';
import x from '../assets/x.svg';
import { importCount, planImport, rowList, skippedCount, sourceName, type ImportError, type ImportPlan } from '../lib/attendeeImport';
import type { DashboardEvent } from '../lib/events';
import { importAttendees, useRoster } from '../lib/roster';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';
import { SwitchRow } from './Switch';

// Figma "Attendees – import from Bevy" and "– import error", at 75% scale, for any platform's CSV
// (the wording isn't in Figma). Opened with
// `done` it shows a finished import's summary again (the toast's Details).
interface Props {
	event: DashboardEvent;
	onClose: () => void;
	/** Called after importing, so the toast's Details can reopen the summary. */
	onImported?: (plan: ImportPlan) => void;
	done?: ImportPlan;
}

export default function ImportDialog({ event, onClose, onImported, done }: Props) {
	const roster = useRoster(event.slug);
	const [result, setResult] = useState<ImportPlan | ImportError | null>(done ?? null);
	// Off by default: an import otherwise never checks anyone in
	const [withCheckIns, setWithCheckIns] = useState(false);
	const input = useRef<HTMLInputElement>(null);
	const choose = () => input.current?.click();

	const plan = result && 'added' in result ? result : null;
	const error = result && 'kind' in result ? result : null;
	const platform = plan && plan.source !== 'csv' ? sourceName[plan.source] : null;
	const offerCheckIns = !done && plan && plan.checkIns.length > 0;
	// A finished import's summary shows the check-ins it brought in, if it was asked to
	const checkIns = done ? done.checkIns : withCheckIns ? (plan?.checkIns ?? []) : [];

	function runImport() {
		if (!plan) return;
		const ran = { ...plan, checkIns };
		const skipped = skippedCount(plan);
		const count = importCount(plan);
		const message = `Imported ${count} attendee${count === 1 ? '' : 's'}${checkIns.length ? `, ${checkIns.length} checked in` : ''}${skipped ? `. ${skipped} row${skipped === 1 ? '' : 's'} skipped` : ''}`;
		// The list shows them straight away; the toast waits until they're saved
		importAttendees(event, roster, plan, checkIns).then(
			() => showToast(message, skipped ? { label: 'Details', onClick: () => onImported?.(ran) } : undefined),
			() => showToast('The import stopped partway. Import the same file again to finish it.'),
		);
		onClose();
	}

	return (
		<Dialog
			title="Import attendees"
			description={
				done
					? `${done.fileName} is imported.`
					: 'Upload the attendee CSV from Bevy, Luma, Humanitix or another registration platform. People are matched by ticket number (guest ID in Luma), so importing the same file again won’t create duplicates.'
			}
			onClose={onClose}
			className="w-[510px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
		>
			<input
				ref={input}
				type="file"
				accept=".csv,text/csv"
				className="hidden"
				onChange={async (e) => {
					const file = e.target.files?.[0];
					e.target.value = '';
					if (file) {
						setResult(await planImport(file, roster));
						setWithCheckIns(false);
					}
				}}
			/>

			{!done && (
				<FileBox
					name={result?.fileName}
					detail={
						plan
							? `${plan.rowCount} row${plan.rowCount === 1 ? '' : 's'}${plan.source === 'csv' ? '' : ` from ${sourceName[plan.source]}`}`
							: error?.kind === 'not-csv'
								? error.fileType
								: error
									? 'CSV file'
									: undefined
					}
					onChoose={choose}
					// The error state offers "Choose another file" as its main button instead
					showReplace={!!plan}
				/>
			)}

			{error && (
				<div role="alert" className="flex items-start gap-4 rounded-lg bg-light-blue px-5 py-4 leading-normal">
					<img src={alert} alt="" width={21} height={21} />
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<p className="text-base font-bold">We can’t read this file</p>
						<p className="text-sm">
							{error.kind === 'not-csv'
								? `Upload the attendee list as a CSV, not ${error.fileType === 'Excel file' ? 'an Excel file' : `a ${error.fileType.replace(' file', '')} file`}. `
								: `It’s missing ${error.missing.length === 1 ? 'a column' : 'columns'} for ${listOf(error.missing)}. `}
							In Bevy, open the event’s attendee list and choose Export → CSV. In Luma, download the guest list as a CSV from the event’s Guests tab. In Humanitix, download the event’s attendee report as a CSV. It needs columns for first name, email and a ticket number or guest ID.
						</p>
					</div>
				</div>
			)}

			{plan && (
				<dl className="flex flex-col">
					<SummaryRow count={plan.added.length} label="new attendees" detail={checkIns.length ? 'Added, checked in where they are below' : 'Added as not arrived'} />
					<SummaryRow
						count={plan.updated.length}
						label="updated"
						detail={`Name, ticket type or answers changed${plan.source === 'csv' ? '' : ` in ${sourceName[plan.source]}`}`}
					/>
					{plan.unchanged > 0 && <SummaryRow count={plan.unchanged} label="unchanged" detail="Already up to date" />}
					{plan.skipped.size === 0 ? (
						<SummaryRow count={0} label="skipped" detail="Every row has what it needs" />
					) : (
						[...plan.skipped].map(([reason, rows]) => <SummaryRow key={reason} count={rows.length} label="skipped" detail={`${reason}: ${rowList(rows)}`} />)
					)}
					{checkIns.length > 0 && (
						<SummaryRow count={checkIns.length} label="checked in" detail={`At the times ${platform ?? 'the file'} recorded`} />
					)}
					{plan.questions.length > 0 && (
						<SummaryRow
							count={plan.questions.length}
							label={`question${plan.questions.length === 1 ? '' : 's'} with answers saved`}
							detail={listOf(plan.questions.map((q) => `“${q}”`))}
						/>
					)}
				</dl>
			)}

			{offerCheckIns && (
				<SwitchRow
					label="Import check-ins"
					note={checkInNote(plan, platform)}
					checked={withCheckIns}
					onChange={setWithCheckIns}
				/>
			)}

			<div className="flex justify-end gap-3">
				{done ? (
					<button type="button" onClick={onClose} className={buttonClass('primary')} data-autofocus>
						Done
					</button>
				) : (
					<>
						<button type="button" onClick={onClose} className={buttonClass('secondary')}>
							Cancel
						</button>
						{error ? (
							<button type="button" onClick={choose} className={buttonClass('primary')}>
								Choose another file
							</button>
						) : (
							<button type="button" disabled={!plan || importCount(plan) === 0} onClick={runImport} className={`${buttonClass('primary')} disabled:opacity-50`}>
								{plan ? `Import ${importCount(plan)} attendee${importCount(plan) === 1 ? '' : 's'}` : 'Import'}
							</button>
						)}
					</>
				)}
			</div>
		</Dialog>
	);
}

function FileBox({ name, detail, onChoose, showReplace }: { name?: string; detail?: string; onChoose: () => void; showReplace: boolean }) {
	// Before a file is chosen the whole box is the picker (not in the design).
	if (!name) {
		return (
			<button
				type="button"
				onClick={onChoose}
				data-autofocus
				className="flex items-center gap-4 rounded-lg border border-dashed border-med-blue bg-off-white px-5 py-4 text-left leading-normal hover:bg-light-blue/40"
			>
				<img src={fileIcon} alt="" width={21} height={21} />
				<span className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="text-base font-bold">Choose the attendee CSV</span>
					<span className="text-sm text-med-blue">From Bevy, Luma, Humanitix or another registration platform</span>
				</span>
			</button>
		);
	}
	return (
		<div className="flex items-center gap-4 rounded-lg border border-dashed border-med-blue bg-off-white px-5 py-4 leading-normal">
			<img src={fileIcon} alt="" width={21} height={21} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="truncate text-base font-bold">{name}</p>
				{detail && <p className="text-sm text-med-blue">{detail}</p>}
			</div>
			{showReplace && (
				<button type="button" onClick={onChoose} className="shrink-0 text-sm font-semibold text-med-blue hover:underline">
					Replace file
				</button>
			)}
		</div>
	);
}

function SummaryRow({ count, label, detail }: { count: number; label: string; detail: string }) {
	return (
		<div className="flex items-center gap-4 border-light-blue py-3 not-first:border-t">
			<dt className="w-[54px] shrink-0 font-display text-2xl leading-tight">{count}</dt>
			<dd className="flex min-w-0 flex-1 flex-col gap-1 leading-normal">
				<span className="text-base font-bold text-dark-blue">{label}</span>
				<span className="text-sm text-med-blue">{detail}</span>
			</dd>
		</div>
	);
}

/** "12 people are checked in on Humanitix and not here. Check them in at the times it recorded." */
function checkInNote(plan: ImportPlan, platform: string | null) {
	const n = plan.checkIns.length;
	const missing = plan.checkInsWithoutTime.length;
	const where = platform ? `on ${platform}` : 'in the file';
	const parts = [
		`${n} ${n === 1 ? 'person is' : 'people are'} checked in ${where} and not here. Check them in at the times ${platform ? 'it' : 'the file'} recorded.`,
		missing > 0 && `${missing === 1 ? 'One row has' : `${missing} rows have`} no check-in time we can read (${rowList(plan.checkInsWithoutTime)}), so ${missing === 1 ? 'it stays' : 'they stay'} as they are.`,
	];
	return parts.filter(Boolean).join(' ');
}

/** "first name", "first name and email", "first name, email and ticket number" */
function listOf(items: string[]) {
	return items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
