import { buttonClass } from '@checkpad/shared/button';
import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import alert from '../assets/alert.svg';
import chevron from '../assets/chevron-small.svg';
import fileIcon from '../assets/file.svg';
import upload from '../assets/upload.svg';
import x from '../assets/x.svg';
import { importCount, planImport, skippedCount, sourceName, type ImportError, type ImportPlan } from '../lib/attendeeImport';
import type { DashboardEvent } from '../lib/events';
import { importAttendees, useRoster } from '../lib/roster';
import { showToast } from '../lib/toast';
import Dialog from './Dialog';
import MiddleTruncate from './MiddleTruncate';
import RollingCount from './RollingCount';

// Import attendees, for any platform's CSV, read in the order it's used: the file, the choices
// this file offers, then a tally of what the import will do, with Import pinned under it. Opened
// with `done` it shows a finished import's tally again (the toast's Details).
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
	// Both off by default: an import otherwise never checks anyone in, and keeps one ticket per email
	const [withCheckIns, setWithCheckIns] = useState(false);
	const [keepSharedEmails, setKeepSharedEmails] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const input = useRef<HTMLInputElement>(null);
	const choose = () => input.current?.click();

	// A file dropped beside the drop targets would otherwise open in the tab, leaving the dashboard
	useEffect(() => {
		const stop = (e: globalThis.DragEvent) => e.dataTransfer?.types.includes('Files') && e.preventDefault();
		window.addEventListener('dragover', stop);
		window.addEventListener('drop', stop);
		return () => {
			window.removeEventListener('dragover', stop);
			window.removeEventListener('drop', stop);
		};
	}, []);

	const plan = result && 'added' in result ? result : null;
	const error = result && 'kind' in result ? result : null;
	const platform = plan && plan.source !== 'csv' ? sourceName[plan.source] : null;
	// A finished import's tally shows the check-ins it brought in, if it was asked to
	const checkIns = done ? done.checkIns : withCheckIns ? (plan?.checkIns ?? []) : [];
	const count = plan ? importCount(plan) : 0;
	// Check-ins for people already on the list; new people's are counted in "New"
	const added = new Set(plan?.added.map((row) => row.ticket.toLowerCase()));
	const checkInsOnList = checkIns.filter((c) => !added.has(c.ticket.toLowerCase())).length;

	async function read(chosen: File) {
		setFile(chosen);
		setWithCheckIns(false);
		setKeepSharedEmails(false);
		setResult(await planImport(chosen, roster));
	}

	async function toggleSharedEmails(keep: boolean) {
		setKeepSharedEmails(keep);
		if (file) setResult(await planImport(file, roster, { keepSharedEmails: keep }));
	}

	function runImport() {
		if (!plan) return;
		const ran = { ...plan, checkIns };
		const skipped = skippedCount(plan);
		const message = `Imported ${count} attendee${count === 1 ? '' : 's'}${checkIns.length ? `, ${checkIns.length} checked in` : ''}${skipped ? `. ${skipped} row${skipped === 1 ? '' : 's'} skipped` : ''}`;
		// The list shows them straight away; the toast waits until they're saved
		importAttendees(event, roster, plan, checkIns).then(
			() => showToast(message, skipped ? { label: 'Details', onClick: () => onImported?.(ran) } : undefined),
			() => showToast('The import stopped partway. Import the same file again to finish it.'),
		);
		onClose();
	}

	const footer = (
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
						<button type="button" disabled={!plan || count === 0} onClick={runImport} className={`${buttonClass('primary')} disabled:opacity-50`}>
							{plan ? `Import ${count} attendee${count === 1 ? '' : 's'}` : 'Import'}
						</button>
					)}
				</>
			)}
		</div>
	);

	return (
		<Dialog
			title="Import attendees"
			description={done ? 'The import is finished. Skipped rows can be fixed on the platform and imported again.' : 'Upload your registration platform’s attendee CSV. Importing it again updates people, never adds them twice.'}
			onClose={onClose}
			className="w-[540px]"
			closeButton={
				<button type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-light-blue/60">
					<img src={x} alt="" width={18} height={18} />
				</button>
			}
			footer={footer}
		>
			<input
				ref={input}
				type="file"
				accept=".csv,text/csv"
				className="hidden"
				onChange={(e) => {
					const chosen = e.target.files?.[0];
					e.target.value = '';
					if (chosen) read(chosen);
				}}
			/>

			{result ? (
				<FileRow
					name={result.fileName}
					detail={plan ? `${plan.rowCount} row${plan.rowCount === 1 ? '' : 's'}${platform ? ` from ${platform}` : ''}` : error?.kind === 'not-csv' ? error.fileType : 'CSV file'}
					onChoose={done ? undefined : choose}
					onDrop={done ? undefined : read}
				/>
			) : (
				<DropZone onChoose={choose} onDrop={read} />
			)}

			{error && (
				<div role="alert" className="flex items-start gap-3 rounded-lg bg-light-blue/60 px-4 py-3.5 leading-normal">
					<img src={alert} alt="" width={20} height={20} className="mt-0.5 shrink-0" />
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<p className="text-sm font-bold">We can’t read this file</p>
						<p className="text-sm">
							{error.kind === 'not-csv'
								? `Upload the attendee list as a CSV, not ${error.fileType === 'Excel file' ? 'an Excel file' : `a ${error.fileType.replace(' file', '')} file`}.`
								: `It’s missing ${error.missing.length === 1 ? 'a column' : 'columns'} for ${listOf(error.missing)}. Use the platform’s own export:`}
						</p>
						<ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-sm marker:text-med-blue">
							<li>Bevy: the event’s attendee list, then Export → CSV</li>
							<li>Luma: the event’s Guests tab, then download as CSV</li>
							<li>Humanitix: the event’s attendee report, as CSV</li>
						</ul>
					</div>
				</div>
			)}

			{plan && !done && (plan.sharedEmails.length > 0 || plan.checkIns.length > 0) && (
				<fieldset className="flex flex-col gap-2">
					<legend className="mb-2 text-sm font-bold">Options</legend>
					{plan.sharedEmails.length > 0 && (
						<Option label="Keep tickets that share an email" note={sharedEmailNote(plan)} checked={keepSharedEmails} onChange={toggleSharedEmails} />
					)}
					{plan.checkIns.length > 0 && <Option label="Import check-ins" note={checkInNote(plan, platform)} checked={withCheckIns} onChange={setWithCheckIns} />}
				</fieldset>
			)}

			{plan && (
				<section aria-labelledby="import-tally" className="flex flex-col gap-2">
					<h3 id="import-tally" className="text-sm font-bold">
						{done ? 'What the import did' : 'What the import will do'}
					</h3>
					<dl className="flex flex-col overflow-hidden rounded-lg border border-line">
						<Tally label="New" note={newNote(plan, checkIns)} count={plan.added.length} />
						{plan.updated.length > 0 && <Tally label="Updated" note={`Name, ticket type or answers changed${platform ? ` in ${platform}` : ''}`} count={plan.updated.length} />}
						{plan.unchanged > 0 && <Tally label="Unchanged" note="Already up to date" count={plan.unchanged} />}
						{checkInsOnList > 0 && <Tally label="Checked in" note={`Already on the list, at the times ${platform ?? 'the file'} recorded`} count={checkInsOnList} />}
						<Skipped plan={plan} />
					</dl>
				</section>
			)}

			{plan && (plan.payments.length > 0 || plan.questions.length > 0) && (
				<section aria-labelledby="import-saved" className="flex flex-col gap-2">
					<h3 id="import-saved" className="text-sm font-bold">
						Also saved
					</h3>
					<ul className="flex flex-col rounded-lg border border-line text-sm leading-normal">
						{plan.payments.length > 0 && (
							<Saved lead={`Payments for ${plan.payments.length} ticket${plan.payments.length === 1 ? '' : 's'}`} rest="price, fees, earnings and codes, for organisers only" />
						)}
						{plan.questions.length > 0 && (
							<Saved lead={`Answers to ${plan.questions.length} question${plan.questions.length === 1 ? '' : 's'}`} rest={listOf(plan.questions.map((q) => `“${q}”`))} />
						)}
					</ul>
				</section>
			)}
		</Dialog>
	);
}

/** Drag and drop for the picker and the chosen file's row: dropping a CSV reads it. */
function useDrop(onDrop?: (file: File) => void) {
	const [over, setOver] = useState(false);
	if (!onDrop) return { over: false, handlers: {} };
	return {
		over,
		handlers: {
			onDragOver: (e: DragEvent) => {
				if (![...e.dataTransfer.types].includes('Files')) return;
				e.preventDefault();
				e.dataTransfer.dropEffect = 'copy';
				setOver(true);
			},
			onDragLeave: (e: DragEvent) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
			},
			onDrop: (e: DragEvent) => {
				e.preventDefault();
				setOver(false);
				const dropped = e.dataTransfer.files[0];
				if (dropped) onDrop(dropped);
			},
		},
	};
}

/** Before a file is chosen: the whole box picks one, and takes a dropped file. */
function DropZone({ onChoose, onDrop }: { onChoose: () => void; onDrop: (file: File) => void }) {
	const { over, handlers } = useDrop(onDrop);
	return (
		<button
			type="button"
			onClick={onChoose}
			data-autofocus
			{...handlers}
			className={`flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center leading-normal transition-colors ${over ? 'border-med-blue bg-light-blue/50' : 'border-med-blue/60 bg-off-white hover:bg-light-blue/30'}`}
		>
			<img src={upload} alt="" width={24} height={24} />
			<span className="flex flex-col gap-1">
				<span className="text-base font-bold">{over ? 'Drop it to read it' : 'Choose the attendee CSV, or drop it here'}</span>
				<span className="text-sm text-med-blue">From Bevy, Luma, Humanitix or another platform</span>
			</span>
		</button>
	);
}

/** The chosen file, with Replace; dropping another file on it replaces it too. */
function FileRow({ name, detail, onChoose, onDrop }: { name: string; detail: string; onChoose?: () => void; onDrop?: (file: File) => void }) {
	const { over, handlers } = useDrop(onDrop);
	return (
		<div
			{...handlers}
			className={`flex items-center gap-3 rounded-lg border px-4 py-3 leading-normal transition-colors ${over ? 'border-med-blue bg-light-blue/50' : 'border-line'}`}
		>
			<img src={fileIcon} alt="" width={20} height={20} className="shrink-0" />
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Exports are named alike up front and told apart by the date at the end */}
				<p className="text-sm font-bold">
					<MiddleTruncate text={name} />
				</p>
				<p className="text-sm text-med-blue">{over ? 'Drop it to read this file instead' : detail}</p>
			</div>
			{onChoose && (
				<button type="button" onClick={onChoose} className="shrink-0 rounded text-sm font-semibold text-med-blue underline-offset-4 hover:underline">
					Replace
				</button>
			)}
		</div>
	);
}

/** A choice this file offers, as a card that's ticked when on (like Export's formats). */
function Option({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (checked: boolean) => void }) {
	return (
		<label className="flex cursor-pointer items-start gap-3 rounded-lg bg-off-white px-4 py-3 leading-normal outline-2 -outline-offset-2 outline-transparent transition-colors has-checked:bg-light-blue/40 has-checked:outline-med-blue has-focus-visible:outline-med-blue">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mt-1 size-4 shrink-0 accent-dark-blue focus-visible:outline-none"
			/>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-bold">{label}</span>
				<span className="text-sm text-med-blue">{note}</span>
			</span>
		</label>
	);
}

/** Something else the import keeps: what, then the detail. */
function Saved({ lead, rest }: { lead: string; rest: string }) {
	return (
		<li className="px-4 py-2.5 not-first:border-t not-first:border-light-blue">
			<span className="font-bold">{lead}</span>
			<span className="text-med-blue">: {rest}</span>
		</li>
	);
}

/** One line of the tally: what, a short note, and how many, the counts lined up on the right. */
function Tally({ label, note, count }: { label: string; note: ReactNode; count: number }) {
	return (
		<div className="flex items-baseline gap-4 px-4 py-2.5 not-first:border-t not-first:border-light-blue">
			<dt className="flex min-w-0 flex-1 flex-col leading-normal sm:flex-row sm:items-baseline sm:gap-2">
				<span className="shrink-0 text-sm font-bold">{label}</span>
				<span className="min-w-0 text-sm text-med-blue">{note}</span>
			</dt>
			<dd className={`shrink-0 text-right text-base font-bold ${count === 0 ? 'text-dark-blue/50' : ''}`}>
				<RollingCount value={count} />
			</dd>
		</div>
	);
}

// Long row lists are cut short: the reason and the first rows are what's needed to find them
const SHOWN_ROWS = 12;

/** Skipped rows: the count, with the reasons and row numbers folded underneath. */
function Skipped({ plan }: { plan: ImportPlan }) {
	const total = skippedCount(plan);
	if (total === 0) return <Tally label="Skipped" note="None: every row has what it needs" count={0} />;
	const reasons = [...plan.skipped];
	return (
		<details className="group not-first:border-t not-first:border-light-blue">
			<summary className="flex cursor-pointer list-none items-baseline gap-4 px-4 py-2.5 hover:bg-off-white [&::-webkit-details-marker]:hidden">
				<span className="flex min-w-0 flex-1 flex-col leading-normal sm:flex-row sm:items-baseline sm:gap-2">
					<span className="shrink-0 text-sm font-bold">Skipped</span>
					<span className="flex min-w-0 items-center gap-1 text-sm text-med-blue">
						{reasons.length === 1 ? reasons[0][0] : `${reasons.length} reasons`}
						<img src={chevron} alt="" width={14} height={14} className="shrink-0 opacity-70 transition-transform group-open:rotate-180" />
					</span>
				</span>
				<span className="shrink-0 text-right text-base font-bold">
					<RollingCount value={total} />
				</span>
			</summary>
			<ul className="flex flex-col gap-1.5 px-4 pb-3 text-sm leading-normal">
				{reasons.map(([reason, rows]) => (
					<li key={reason}>
						{/* With one reason it's already on the line above */}
						{reasons.length > 1 && <span className="font-semibold">{reason} · </span>}
						<span className="text-med-blue">
							{rows.length === 1 ? 'Row' : 'Rows'} {rows.slice(0, SHOWN_ROWS).join(', ')}
							{rows.length > SHOWN_ROWS && ` and ${rows.length - SHOWN_ROWS} more`}
						</span>
					</li>
				))}
			</ul>
		</details>
	);
}

/** "6 tickets share an email with another ticket, as when one person books for a group…" */
function sharedEmailNote(plan: ImportPlan) {
	const n = plan.sharedEmails.length;
	return `${n === 1 ? 'One ticket shares its' : `${n} tickets share an`} email with another, as when someone books for a group. At the door that email checks in one of them; staff check in the rest.`;
}

/** "Added as not arrived", or with how many of them arrive checked in */
function newNote(plan: ImportPlan, checkIns: ImportPlan['checkIns']) {
	const added = new Set(plan.added.map((row) => row.ticket.toLowerCase()));
	const arrived = checkIns.filter((c) => added.has(c.ticket.toLowerCase())).length;
	if (!arrived) return 'Added as not arrived';
	return arrived === plan.added.length ? 'Added as checked in' : `Added, ${arrived} of them checked in`;
}

/** "12 people are checked in on Humanitix and not here. Check them in at the times it recorded." */
function checkInNote(plan: ImportPlan, platform: string | null) {
	const n = plan.checkIns.length;
	const missing = plan.checkInsWithoutTime.length;
	const parts = [
		`${n} ${n === 1 ? 'person is' : 'people are'} checked in ${platform ? `on ${platform}` : 'in the file'} but not here. They’re checked in at the times ${platform ? 'it' : 'the file'} recorded.`,
		missing > 0 && `${missing === 1 ? 'One row has' : `${missing} rows have`} no check-in time we can read, so ${missing === 1 ? 'it stays' : 'they stay'} as they are.`,
	];
	return parts.filter(Boolean).join(' ');
}

/** "first name", "first name and email", "first name, email and ticket number" */
function listOf(items: string[]) {
	return items.length < 3 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
