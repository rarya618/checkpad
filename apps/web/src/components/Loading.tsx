import { Spinner } from './SubmitButton';

/** Shown while the page asks the API where a link goes. */
export default function Loading() {
	return (
		<main aria-busy="true" className="flex min-h-dvh items-center justify-center text-med-blue">
			<Spinner />
			<span className="sr-only">Loading</span>
		</main>
	);
}
