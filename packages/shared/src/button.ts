// Shared so Astro links and React buttons render the same Figma "Button" component.
const base = 'flex items-center justify-center font-display transition-colors disabled:cursor-not-allowed';

// Hover only applies on devices that can hover, and never to a disabled button
const variants = {
	primary: 'bg-dark-blue text-off-white not-disabled:hover:bg-dark-blue-hover',
	secondary: 'bg-light-blue text-dark-blue not-disabled:hover:bg-light-blue-hover',
};

const sizes = {
	md: 'rounded-[10px] px-7.5 py-2.5 text-lg',
	// Compact version used inside table rows (Figma attendee "Check in" button)
	sm: 'rounded-[6px] px-6 py-[7.5px] text-[15px]',
	// Full-size Figma button (24px label) on phone screens, where designs aren't scaled down
	lg: 'rounded-[12px] px-10 py-3 text-2xl leading-[1.5]',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
	return `${base} ${sizes[size]} ${variants[variant]}`;
}
