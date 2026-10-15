// Shared so Astro links and React buttons render the same Figma "Button" component.
const base =
	'flex items-center justify-center rounded-[10px] px-7.5 py-2.5 font-display text-lg disabled:cursor-not-allowed';

const variants = {
	primary: 'bg-dark-blue text-off-white',
	secondary: 'bg-light-blue text-dark-blue',
};

export type ButtonVariant = keyof typeof variants;

export function buttonClass(variant: ButtonVariant = 'primary') {
	return `${base} ${variants[variant]}`;
}
