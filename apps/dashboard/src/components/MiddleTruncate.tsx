import { useLayoutEffect, useRef, useState } from 'react';

// A link too long for its line, cut short in the middle: "localhost:4321/checkpad-demo-regis…only".
// The start is the same on every link and the end is what tells events and teams apart, so the
// end always shows, as whole words: the last part after a hyphen or slash, up to 12 characters
// (or the last 10, when the last part is longer). A link that fits shows whole.
//
// The browser can only cut at the end, so this measures instead: an invisible copy of the whole
// link gives the box its width (no wider than the line), and the text shown is as much of the
// start as fits in it, "…", then the end, worked out with the box's own font and redone as it
// resizes. Screen readers get the whole link.

const MAX_TAIL = 12;

/** The end that always shows: "only" of checkpad-demo-registered-only, "sydney" of team/gdg-sydney. */
function tailOf(text: string) {
	let tail = '';
	for (let i = text.length - 1; i > 0; i--) {
		if (text.length - i - 1 > MAX_TAIL) break;
		if (text[i] === '-' || text[i] === '/') tail = text.slice(i + 1);
	}
	return tail.length >= 3 ? tail : text.slice(-10);
}

let canvas: CanvasRenderingContext2D | null = null;

export default function MiddleTruncate({ text, className = '' }: { text: string; /** For the shown text: a link's underline. */ className?: string }) {
	const box = useRef<HTMLSpanElement>(null);
	const [shown, setShown] = useState(text);

	useLayoutEffect(() => {
		const el = box.current;
		if (!el) return;
		canvas ??= document.createElement('canvas').getContext('2d');
		const fit = () => {
			if (!canvas) return setShown(text);
			const style = getComputedStyle(el);
			canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
			if ('letterSpacing' in canvas) canvas.letterSpacing = style.letterSpacing;
			const room = el.clientWidth;
			const width = (s: string) => canvas!.measureText(s).width;
			if (width(text) <= room + 0.5) return setShown(text);
			const tail = tailOf(text);
			// The longest start that fits beside the "…" and the end
			let lo = 0;
			let hi = text.length - tail.length;
			while (lo < hi) {
				const mid = Math.ceil((lo + hi) / 2);
				if (width(`${text.slice(0, mid)}…${tail}`) <= room) lo = mid;
				else hi = mid - 1;
			}
			setShown(`${text.slice(0, lo)}…${tail}`);
		};
		fit();
		const resizes = new ResizeObserver(fit);
		resizes.observe(el);
		// Measured again once the web font has loaded, if it hadn't
		document.fonts?.ready.then(fit);
		return () => resizes.disconnect();
	}, [text]);

	return (
		<span ref={box} className="relative block min-w-0 overflow-hidden whitespace-nowrap">
			<span aria-hidden="true" className="invisible">
				{text}
			</span>
			<span aria-hidden="true" className={`absolute inset-0 ${className}`}>
				{shown}
			</span>
			<span className="sr-only">{text}</span>
		</span>
	);
}
