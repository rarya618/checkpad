import { buttonClass } from '@checkpad/shared/button';
import logo from '@checkpad/shared/checkpad-logo.svg';

interface Props {
	title: string;
	subtitle: string;
	body: string;
}

// Full-screen message layout from the Figma "Error handling" frame, also used for
// the "not open yet" and "closed" states.
export default function StatusScreen({ title, subtitle, body }: Props) {
	return (
		<main className="mx-auto flex min-h-dvh max-w-[420px] flex-col items-center justify-between gap-9 px-9 py-12 text-center">
			<img src={logo.src} alt="checkpad" width={176} height={42} />
			<div className="flex w-full flex-col items-center gap-4.5">
				<div className="flex w-full flex-col items-center gap-2">
					<h1 className="font-display text-[40px]">{title}</h1>
					<p className="text-2xl leading-9 text-med-blue">{subtitle}</p>
				</div>
				<p className="text-lg leading-7.5">{body}</p>
			</div>
			<a href="/" className={`w-full ${buttonClass('primary')}`}>
				Back to homepage
			</a>
		</main>
	);
}
