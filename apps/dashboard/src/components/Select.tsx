import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import check from '../assets/check-blue.svg';

// The dashboard's dropdown, in place of the browser's: a button showing the choice, and a list
// under it drawn like the venue suggestions and the ⋮ menus (a white popover with a hairline edge),
// the choice ticked. Options are written as <option> and <optgroup>, as for a <select>, so fields
// read the same; groups become small headings. The keyboard works as a select's does: arrows,
// Home and End, Enter or Space to choose, Escape to close, and typing a few letters jumps to the
// first option that starts with them.

export interface SelectOption {
	value: string;
	label: string;
	group?: string;
}

/** The options written as <option> and <optgroup> children, in order. */
function optionsOf(children: ReactNode, group?: string): SelectOption[] {
	return Children.toArray(children).flatMap((child) => {
		if (!isValidElement(child)) return [];
		const el = child as ReactElement<{ value?: string; label?: string; children?: ReactNode }>;
		if (el.type === 'optgroup') return optionsOf(el.props.children, el.props.label);
		if (el.type !== 'option') return [];
		const label = Children.toArray(el.props.children).join('');
		return [{ value: String(el.props.value ?? label), label, ...(group && { group }) }];
	});
}

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

export default function Select({ value, onChange, children, id, disabled, required, buttonClassName, chevron, align = 'stretch', ...aria }: Props) {
	const options = optionsOf(children);
	const listId = useId();
	const button = useRef<HTMLButtonElement>(null);
	const list = useRef<HTMLUListElement>(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const [above, setAbove] = useState(false);
	const typed = useRef({ text: '', at: 0 });
	const selected = options.findIndex((o) => o.value === value);
	const shown = options[selected]?.label ?? '';

	function openList(at = selected >= 0 ? selected : 0) {
		if (disabled || !options.length) return;
		// Opens upwards when there's more room above, as near the bottom of a dialog or page
		const box = button.current!.getBoundingClientRect();
		setAbove(window.innerHeight - box.bottom < 280 && box.top > window.innerHeight - box.bottom);
		setActive(at);
		setOpen(true);
	}

	function close(refocus = true) {
		setOpen(false);
		if (refocus) button.current?.focus();
	}

	function choose(i: number) {
		const o = options[i];
		if (o && o.value !== value) onChange(o.value);
		close();
	}

	// The active option stays in view as the keys move through a long list
	useLayoutEffect(() => {
		if (open && active >= 0) list.current?.querySelector(`#${CSS.escape(`${listId}-${active}`)}`)?.scrollIntoView({ block: 'nearest' });
	}, [open, active, listId]);

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			if (!button.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) close(false);
		};
		document.addEventListener('pointerdown', onPointerDown);
		return () => document.removeEventListener('pointerdown', onPointerDown);
	}, [open]);

	/** Typing jumps to the first option starting with what's been typed in the last half second. */
	function typeahead(key: string) {
		const now = Date.now();
		typed.current = { text: now - typed.current.at < 500 ? typed.current.text + key.toLowerCase() : key.toLowerCase(), at: now };
		const text = typed.current.text;
		const start = open ? active : selected;
		const order = [...options.keys()].map((n) => (n + Math.max(0, start) + (text.length === 1 ? 1 : 0)) % options.length);
		const hit = order.find((n) => options[n].label.toLowerCase().startsWith(text));
		if (hit === undefined) return;
		if (open) setActive(hit);
		else if (options[hit].value !== value) onChange(options[hit].value);
	}

	function onKeyDown(e: KeyboardEvent) {
		const last = options.length - 1;
		if (!open) {
			if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
				e.preventDefault();
				openList();
			} else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
				typeahead(e.key);
			}
			return;
		}
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			setActive((i) => Math.min(last, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1))));
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			setActive(e.key === 'Home' ? 0 : last);
		} else if (e.key === 'Enter' || (e.key === ' ' && typed.current.text === '')) {
			e.preventDefault();
			choose(active);
		} else if (e.key === 'Escape') {
			// Closes the list, not the dialog it's in
			e.preventDefault();
			e.stopPropagation();
			close();
		} else if (e.key === 'Tab') {
			close(false);
		} else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
			e.preventDefault();
			typeahead(e.key);
		}
	}

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
				aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
				aria-required={required || undefined}
				disabled={disabled}
				onClick={() => (open ? close() : openList())}
				onKeyDown={onKeyDown}
				onBlur={(e) => {
					if (!list.current?.contains(e.relatedTarget as Node)) setOpen(false);
				}}
				{...aria}
				className={`relative block text-left ${buttonClassName}`}
			>
				<span className="block truncate">{shown || ' '}</span>
				<svg
					aria-hidden="true"
					viewBox="0 0 18 18"
					width={chevron.size}
					height={chevron.size}
					className={`pointer-events-none absolute top-1/2 ${chevron.right} -translate-y-1/2 transition-transform ${open ? 'rotate-180' : ''}`}
				>
					<path d="M4.5 6.75L9 11.25L13.5 6.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</button>
			{open && (
				<ul
					ref={list}
					id={listId}
					role="listbox"
					aria-label={aria['aria-label']}
					aria-labelledby={aria['aria-label'] ? undefined : id}
					tabIndex={-1}
					data-popover
					// Grows out of the corner it hangs from
					style={{ transformOrigin: `${above ? 'bottom' : 'top'} ${align === 'end' ? 'right' : 'left'}` }}
					className={`absolute right-0 z-30 flex max-h-[min(320px,45dvh)] flex-col overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-[0_9px_30px_rgb(17_45_78/0.14)] ${
						align === 'end' ? 'w-max max-w-[min(320px,calc(100vw-32px))] min-w-full' : 'left-0'
					} ${
						above ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
					}`}
				>
					{options.map((o, i) => (
						<li key={`${o.group ?? ''}|${o.value}`} role="none" className="contents">
							{o.group && o.group !== options[i - 1]?.group && (
								<p role="presentation" className="px-3 pt-2.5 pb-1 text-xs leading-normal font-semibold text-med-blue first:pt-1">
									{o.group}
								</p>
							)}
							<div
								id={`${listId}-${i}`}
								role="option"
								aria-selected={i === selected}
								// Keeps focus on the button, so the list stays open until the choice lands
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => choose(i)}
								onMouseMove={() => active !== i && setActive(i)}
								className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm leading-normal text-dark-blue ${i === active ? 'bg-off-white' : ''} ${i === selected ? 'font-semibold' : ''}`}
							>
								<span className="min-w-0 flex-1">{o.label}</span>
								{i === selected && <img src={check} alt="" width={16} height={16} className="shrink-0" />}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
