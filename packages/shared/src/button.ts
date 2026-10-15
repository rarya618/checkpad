// Shared so Astro links and React buttons render the same Figma "Button" component.
const base = 'flex items-center justify-center font-display disabled:cursor-not-allowed';

const variants = {
	primary: 'bg-dark-blue text-off-white',
	secondary: 'bg-light-blue text-dark-blue',
};

const sizes = {
	md: 'rounded-[10px] px-7.5 py-2.5 text-lg',
	// Compact version used inside table rows (Figma attendee "Check in" button)
	sm: 'rounded-[6px] px-6 py-[7.5px] text-[15px]',
};

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
	return `${base} ${sizes[size]} ${variants[variant]}`;
}
