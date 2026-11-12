// Shared so Astro links and React buttons render the same Figma "Button" component.
// `button` has no styles of its own; apps/web uses it to keep buttons full size on zoomed-out pages.
const base = 'button flex items-center justify-center font-display transition-colors disabled:cursor-not-allowed';

// Hover only applies on devices that can hover, and never to a disabled button
const variants = {
	primary: 'bg-dark-blue text-off-white not-disabled:hover:bg-dark-blue-hover',
	secondary: 'bg-light-blue text-dark-blue not-disabled:hover:bg-light-blue-hover',
	// The main action on a dark-blue background (the prize draw display)
	accent: 'bg-med-blue text-off-white not-disabled:hover:bg-med-blue-hover',
};

const sizes = {
	// A step smaller than Figma's 18px label, to sit with the smaller sidebar and menu text
	md: 'rounded-lg px-6 py-1.5 text-base',
	// Compact version used inside table rows (Figma attendee "Check in" button)
	sm: 'rounded-md px-6 py-2 text-sm',
	// Full-size Figma button (24px label) on phone screens, where designs aren't scaled down
	lg: 'rounded-xl px-10 py-3 text-2xl leading-normal',
	// Between the two: an 18px label in a ~50px button, easy to tap on the attendee check-in page
	tall: 'rounded-lg px-6 py-3 text-lg',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
	return `${base} ${sizes[size]} ${variants[variant]}`;
}
