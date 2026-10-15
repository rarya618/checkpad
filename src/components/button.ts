// Shared so Astro links and React buttons render the same Figma "Button" component.
const base =
	'flex items-center justify-center rounded-[12px] px-10 py-3 font-display text-2xl transition-opacity disabled:opacity-60';

const variants = {
	primary: 'bg-dark-blue text-off-white',
	secondary: 'bg-light-blue text-dark-blue',
};

export type ButtonVariant = keyof typeof variants;

export function buttonClass(variant: ButtonVariant = 'primary') {
	return `${base} ${variants[variant]}`;
}
