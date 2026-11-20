import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode, type RefObject } from 'react';

// The dashboard's dropdown, in place of the browser's, drawn like the sidebar: the choice sits on
// a light-blue fill in bold, as the page you're on does, and a fainter fill slides to whatever is
// pointed at or reached with the arrow keys, as the Organisers rail's does. Groups are small
// med-blue headings that stay in view while their options scroll. Long lists (time zones,
// countries) open with a search box; typing on the closed field starts the search with that letter.
//
// Options are written as <option> and <optgroup>, as for a <select>, so fields read the same;
// `data-detail` on an option adds a quieter note at its right, e.g. the time there now.

export interface SelectOption {
	value: string;
	label: string;
	detail?: string;
	group?: string;
}

/** The options written as <option> and <optgroup> children, in order. */
function optionsOf(children: ReactNode, group?: string): SelectOption[] {
	return Children.toArray(children).flatMap((child) => {
		if (!isValidElement(child)) return [];
		const el = child as ReactElement<{ value?: string; label?: string; children?: ReactNode; 'data-detail'?: string }>;
		if (el.type === 'optgroup') return optionsOf(el.props.children, el.props.label);
		if (el.type !== 'option') return [];
		const label = Children.toArray(el.props.children).join('');
		return [{ value: String(el.props.value ?? label), label, ...(el.props['data-detail'] && { detail: el.props['data-detail'] }), ...(group && { group }) }];
	});
}

// Lists longer than this open with a search box
const SEARCH_FROM = 12;

interface Props {
	value: string;
	onChange: (value: string) => void;
	children: ReactNode;
	/** The button's id, so a <label htmlFor> names it. */
	id?: string;
	/** Its name when no label points at it (the Analytics filters). */
	'aria-label'?: string;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
	disabled?: boolean;
	required?: boolean;
	/** What the list holds, for the search box: "time zones", "countries". */
	noun?: string;
	/** The button's look: a field's filled box, or a filter's bordered one. */
	buttonClassName: string;
	/** The chevron's size and place, from the field size. */
	chevron: { size: number; right: string };
	/**
	 * "stretch" (fields): the list is the button's width. "end" (the Analytics filters, at the
	 * right of the header): the list is as wide as its options, its right edge on the button's.
	 */
	align?: 'stretch' | 'end';
}

export default function Select({ value, onChange, children, id, disabled, required, noun = 'options', buttonClassName, chevron, align = 'stretch', ...aria }: Props) {
	const options = optionsOf(children);
	const searchable = options.length > SEARCH_FROM;
	const listId = useId();
	const button = useRef<HTMLButtonElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const scroller = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	// After closing, the list stays drawn while it rolls back up into the field (index.css)
	const [closing, setClosing] = useState(false);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(-1);
	const [above, setAbove] = useState(false);
	const typed = useRef({ text: '', at: 0 });
	const shownLabel = options.find((o) => o.value === value)?.label ?? '';

	// What the list shows: everything, or what matches the search by name or by group (a country)
	const q = query.trim().toLowerCase();
	const matches = (o: SelectOption, text: string) => o.label.toLowerCase().includes(text) || !!o.group?.toLowerCase().includes(text);
	const shown = q ? options.filter((o) => matches(o, q)) : options;
	const selected = shown.findIndex((o) => o.value === value);
	const inPanel = (node: Node | null) => !!node && !!panel.current?.contains(node);

	function openList(startQuery = '') {
		if (disabled || !options.length) return;
		// Opens upwards when there's more room above, as near the bottom of a dialog or page
		const box = button.current!.getBoundingClientRect();
		setAbove(window.innerHeight - box.bottom < 300 && box.top > window.innerHeight - box.bottom);
		setQuery(startQuery);
		const at = (startQuery ? options.filter((o) => matches(o, startQuery.toLowerCase())) : options).findIndex((o) => o.value === value);
		setActive(startQuery ? 0 : Math.max(0, at));
		setClosing(false);
		setOpen(true);
	}

	function close(refocus = true) {
		if (!open) return;
		setOpen(false);
		// Rolls up, then goes; with reduced motion it just goes
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) finishClosing();
		else setClosing(true);
		if (refocus) button.current?.focus();
	}

	function finishClosing() {
		setClosing(false);
		setQuery('');
	}

	// In case the roll-up's end is never reported (the tab hidden mid-way), it still goes
	useEffect(() => {
		if (!closing) return;
		const t = setTimeout(finishClosing, 400);
		return () => clearTimeout(t);
	}, [closing]);

	function choose(i: number) {
		const o = shown[i];
		if (!o) return;
		if (o.value !== value) onChange(o.value);
		close();
	}

	// The search box takes the keys once a long list opens
	useEffect(() => {
		if (open && searchable) search.current?.focus();
	}, [open, searchable]);

	// The active option stays in view, below its pinned group heading, as the keys move through a long list
	useLayoutEffect(() => {
		const box = scroller.current;
		const el = open && active >= 0 ? box?.querySelector<HTMLElement>(`#${CSS.escape(`${listId}-${active}`)}`) : null;
		if (!box || !el) return;
		const top = el.offsetTop - (shown[active]?.group ? 32 : 6);
		const bottom = el.offsetTop + el.offsetHeight + 6;
		if (top < box.scrollTop) box.scrollTop = top;
		else if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = bottom - box.clientHeight;
	}, [open, active, listId, shown]);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			if (!button.current?.contains(e.target as Node) && !inPanel(e.target as Node)) close(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open]);

	/** Short lists: typing jumps to the first option starting with what's been typed in the last half second. */
	function typeahead(key: string) {
		const now = Date.now();
		typed.current = { text: now - typed.current.at < 500 ? typed.current.text + key.toLowerCase() : key.toLowerCase(), at: now };
		const text = typed.current.text;
		const from = open ? active : options.findIndex((o) => o.value === value);
		const order = [...options.keys()].map((n) => (n + Math.max(0, from) + (text.length === 1 ? 1 : 0)) % options.length);
		const hit = order.find((n) => options[n].label.toLowerCase().startsWith(text));
		if (hit === undefined) return;
		if (open) setActive(hit);
		else if (options[hit].value !== value) onChange(options[hit].value);
	}

	/** Keys while the list is open, from the button (short lists) or the search box (long ones). */
	function onListKeys(e: KeyboardEvent) {
		const last = shown.length - 1;
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			setActive((i) => Math.min(last, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
		} else if ((e.key === 'Home' || e.key === 'End') && !searchable) {
			e.preventDefault();
			setActive(e.key === 'Home' ? 0 : last);
		} else if (e.key === 'Enter' || (e.key === ' ' && !searchable && typed.current.text === '')) {
			e.preventDefault();
			choose(active);
		} else if (e.key === 'Escape') {
			// Clears the search first, then closes the list; never the dialog it's in
			e.preventDefault();
			e.stopPropagation();
			if (query) {
				setQuery('');
				setActive(Math.max(0, options.findIndex((o) => o.value === value)));
			} else close();
		} else if (e.key === 'Tab') {
			close(false);
		} else if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			typeahead(e.key);
		}
	}

	function onButtonKeys(e: KeyboardEvent) {
		if (open) return onListKeys(e);
		if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
			e.preventDefault();
			openList();
		} else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
			// A long list opens searching for the letter; a short one jumps to it
			if (searchable) {
				e.preventDefault();
				openList(e.key);
			} else typeahead(e.key);
		}
	}

	const activeId = open && active >= 0 && shown[active] ? `${listId}-${active}` : undefined;

	return (
		<div className="relative">
			<button
				ref={button}
				id={id}
				type="button"
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				aria-activedescendant={searchable ? undefined : activeId}
				aria-required={required || undefined}
				disabled={disabled}
				onClick={() => (open ? close() : openList())}
				onKeyDown={onButtonKeys}
				onBlur={(e) => {
					if (!inPanel(e.relatedTarget as Node)) close(false);
				}}
				{...aria}
				className={`relative block text-left ${buttonClassName}`}
			>
				<span className="block truncate">{shownLabel || ' '}</span>
				<svg
					aria-hidden="true"
					viewBox="0 0 18 18"
					width={chevron.size}
					height={chevron.size}
					className={`pointer-events-none absolute top-1/2 ${chevron.right} -translate-y-1/2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
				>
					<path d="M4.5 6.75L9 11.25L13.5 6.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>
			{(open || closing) && (
				<div
					ref={panel}
					// Unrolls from the field's edge, down or up, and rolls back into it on closing (index.css)
					data-select-panel
					data-above={above || undefined}
					data-closing={closing || undefined}
					inert={closing || undefined}
					onTransitionEnd={(e) => {
						if (closing && e.target === e.currentTarget && e.propertyName === 'clip-path') finishClosing();
					}}
					className={`absolute right-0 z-30 flex max-h-[min(360px,50dvh)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_9px_30px_rgb(17_45_78/0.14)] ${
						align === 'end' ? 'w-max max-w-[min(320px,calc(100vw-32px))] min-w-full' : 'left-0'
					} ${above ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'}`}
				>
					{searchable && (
						<div className="border-b border-light-blue p-1.5">
							<label className="flex items-center gap-2 rounded-lg bg-off-white px-3 py-2 focus-within:outline-[1.5px] focus-within:-outline-offset-[1.5px] focus-within:outline-med-blue">
								<svg aria-hidden="true" viewBox="0 0 16 16" width={14} height={14} className="shrink-0 text-med-blue">
									<circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
									<path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
								</svg>
								<span className="sr-only">Search {noun}</span>
								<input
									ref={search}
									type="text"
									role="combobox"
									aria-expanded="true"
									aria-controls={listId}
									aria-activedescendant={activeId}
									aria-autocomplete="list"
									autoComplete="off"
									spellCheck={false}
									value={query}
									placeholder={`Search ${noun}`}
									onChange={(e) => {
										setQuery(e.target.value);
										setActive(0);
									}}
									onKeyDown={onListKeys}
									onBlur={(e) => {
										if (e.relatedTarget !== button.current && !inPanel(e.relatedTarget as Node)) close(false);
									}}
									className="min-w-0 flex-1 bg-transparent text-sm leading-normal text-dark-blue outline-none placeholder:text-dark-blue/50"
								/>
							</label>
						</div>
					)}
					<div ref={scroller} className="min-h-0 overflow-y-auto overscroll-contain p-1.5">
						{shown.length ? (
							<ul id={listId} role="listbox" aria-label={aria['aria-label']} aria-labelledby={aria['aria-label'] ? undefined : id} className="relative flex flex-col">
								<Highlight list={scroller} target={activeId} />
								{shown.map((o, i) => (
									<li key={`${o.group ?? ''}|${o.value}`} role="none" className="contents">
										{o.group && o.group !== shown[i - 1]?.group && (
											// Pinned while its options scroll under it, so a long list never loses its place
											<p role="presentation" className="sticky -top-1.5 z-10 -mx-1.5 bg-white/95 px-4.5 pt-2.5 pb-1 text-xs leading-normal font-semibold text-med-blue backdrop-blur-sm first:pt-1">
												{o.group}
											</p>
										)}
										<div
											id={`${listId}-${i}`}
											role="option"
											aria-selected={i === selected}
											// Keeps focus where it is, so the list stays open until the choice lands
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => choose(i)}
											onMouseMove={() => active !== i && setActive(i)}
											className={`relative flex cursor-pointer items-baseline gap-3 rounded-md px-3 py-2 text-sm leading-normal text-dark-blue ${
												i === selected ? 'bg-light-blue font-bold tracking-tight' : ''
											}`}
										>
											<span className="min-w-0 flex-1">
												<Match text={o.label} query={q} />
											</span>
											{o.detail && <span className={`shrink-0 text-xs font-normal tabular-nums ${i === selected ? 'text-dark-blue/70' : 'text-med-blue'}`}>{o.detail}</span>}
										</div>
									</li>
								))}
							</ul>
						) : (
							<p role="status" className="px-3 py-2.5 text-sm leading-normal text-med-blue">
								No {noun} match “{query.trim()}”.
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * The fill under whatever is pointed at or reached with the keys: one element that slides to it
 * (index.css, the rail's 220ms ease) rather than a fill per option, so moving through the list
 * reads as movement. It jumps into place when the list opens, and slides after that.
 */
function Highlight({ list, target }: { list: RefObject<HTMLDivElement | null>; target?: string }) {
	const [box, setBox] = useState<{ top: number; height: number; moved: boolean } | null>(null);
	useLayoutEffect(() => {
		const el = target ? list.current?.querySelector<HTMLElement>(`#${CSS.escape(target)}`) : null;
		setBox((before) => (el ? { top: el.offsetTop, height: el.offsetHeight, moved: before !== null } : null));
	}, [target, list]);
	if (!box) return null;
	return (
		<li
			role="none"
			aria-hidden="true"
			data-select-highlight
			data-moved={box.moved || undefined}
			className="pointer-events-none absolute top-0 right-0 left-0 rounded-md bg-light-blue/45"
			style={{ transform: `translateY(${box.top}px)`, height: box.height }}
		/>
	);
}

/** The part of an option that matches the search, underlined in med-blue; the rest as it is. */
function Match({ text, query }: { text: string; query: string }) {
	const at = query ? text.toLowerCase().indexOf(query) : -1;
	if (at < 0) return <>{text}</>;
	return (
		<>
			{text.slice(0, at)}
			<span className="underline decoration-med-blue decoration-2 underline-offset-[3px]">{text.slice(at, at + query.length)}</span>
			{text.slice(at + query.length)}
		</>
	);
}
