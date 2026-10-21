import { buttonClass } from '@checkpad/shared/button';
import { useRef, useState } from 'react';
import alert from '../assets/alert.svg';
import fileIcon from '../assets/file.svg';
import x from '../assets/x.svg';
import { importCount, planImport, rowList, skippedCount, type ImportError, type ImportPlan } from '../lib/bevy';
import type { DashboardEvent } from '../lib/events';
import { importAttendees, useRoster } from '../lib/roster';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';

// Figma "Attendees – import from Bevy" and "– import error", at 75% scale. Opened with
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
	const input = useRef<HTMLInputElement>(null);
	const choose = () => input.current?.click();

	const plan = result && 'added' in result ? result : null;
	const error = result && 'kind' in result ? result : null;

	function runImport() {
		if (!plan) return;
		const skipped = skippedCount(plan);
		const count = importCount(plan);
		const message = `Imported ${count} attendee${count === 1 ? '' : 's'}${skipped ? `. ${skipped} row${skipped === 1 ? '' : 's'} skipped` : ''}`;
		// The list shows them straight away; the toast waits until they're saved
		importAttendees(event, roster, plan).then(
			() => showToast(message, skipped ? { label: 'Details', onClick: () => onImported?.(plan) } : undefined),
			() => showToast('The import stopped partway. Import the same file again to finish it.'),
		);
		onClose();
	}

	return (
		<Dialog
			title="Import from Bevy"
			description={
				done
					? `${done.fileName} is imported.`
					: 'Upload the attendee CSV exported from Bevy. People are matched by ticket number, so importing the same file again won’t create duplicates.'
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
					if (file) setResult(await planImport(file, roster));
				}}
			/>

			{!done && (
				<FileBox
					name={result?.fileName}
					detail={plan ? `${plan.rowCount} row${plan.rowCount === 1 ? '' : 's'}` : error?.kind === 'not-csv' ? error.fileType : error ? 'CSV file' : undefined}
					onChoose={choose}
					// The error state offers "Choose another file" as its main button instead
					showReplace={!!plan}
				/>
			)}

			{error && (
				<div role="alert" className="flex items-start gap-3 rounded-[9px] bg-light-blue py-[15px] pr-[18px] pl-[15px] leading-[1.5]">
					<img src={alert} alt="" width={21} height={21} />
					<div className="flex min-w-0 flex-1 flex-col gap-[4.5px]">
						<p className="text-[15px] font-bold">We can’t read this file</p>
						<p className="text-[13.5px]">
							{error.kind === 'not-csv'
								? `Upload the CSV from Bevy, not ${error.fileType === 'Excel file' ? 'an Excel file' : `a ${error.fileType.replace(' file', '')} file`}. `
								: `It’s missing ${error.missing.length === 1 ? 'a column' : 'columns'} for ${listOf(error.missing)}. `}
							In Bevy, open the event’s attendee list and choose Export → CSV. It needs columns for first name, last name, email and ticket number.
						</p>
					</div>
				</div>
			)}

			{plan && (
				<dl className="flex flex-col">
					<SummaryRow count={plan.added.length} label="new attendees" detail="Added as not arrived" />
					<SummaryRow count={plan.updated.length} label="updated" detail="Name or ticket type changed in Bevy" />
					{plan.unchanged > 0 && <SummaryRow count={plan.unchanged} label="unchanged" detail="Already up to date" />}
					{plan.skipped.size === 0 ? (
						<SummaryRow count={0} label="skipped" detail="Every row has what it needs" />
					) : (
						[...plan.skipped].map(([reason, rows]) => <SummaryRow key={reason} count={rows.length} label="skipped" detail={`${reason}: ${rowList(rows)}`} />)
					)}
				</dl>
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
				className="flex items-center gap-3 rounded-[9px] border border-dashed border-med-blue bg-off-white py-[13.5px] pr-[18px] pl-[15px] text-left leading-[1.5] hover:bg-light-blue/40"
			>
				<img src={fileIcon} alt="" width={21} height={21} />
				<span className="flex min-w-0 flex-1 flex-col gap-[1.5px]">
					<span className="text-[15px] font-bold">Choose the CSV from Bevy</span>
					<span className="text-xs text-med-blue">Export → CSV on the event’s attendee list</span>
				</span>
			</button>
		);
	}
	return (
		<div className="flex items-center gap-3 rounded-[9px] border border-dashed border-med-blue bg-off-white py-[13.5px] pr-[18px] pl-[15px] leading-[1.5]">
			<img src={fileIcon} alt="" width={21} height={21} />
			<div className="flex min-w-0 flex-1 flex-col gap-[1.5px]">
				<p className="truncate text-[15px] font-bold">{name}</p>
				{detail && <p className="text-xs text-med-blue">{detail}</p>}
			</div>
			{showReplace && (
				<button type="button" onClick={onChoose} className="shrink-0 text-[13.5px] font-semibold text-med-blue hover:underline">
					Replace file
				</button>
			)}
		</div>
	);
}

function SummaryRow({ count, label, detail }: { count: number; label: string; detail: string }) {
	return (
		<div className="flex items-center gap-3 border-light-blue py-[10.5px] not-first:border-t">
			<dt className="w-[54px] shrink-0 font-display text-2xl leading-[1.2]">{count}</dt>
			<dd className="flex min-w-0 flex-1 flex-col gap-[1.5px] leading-[1.5]">
				<span className="text-[15px] font-bold text-black">{label}</span>
				<span className="text-xs text-med-blue">{detail}</span>
			</dd>
		</div>
	);
}

/** "first name", "first name and email", "first name, email and ticket number" */
function listOf(items: string[]) {
	return items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
