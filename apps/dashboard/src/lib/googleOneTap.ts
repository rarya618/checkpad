// Google One Tap on the sign-in page: Google's own "Continue as …" prompt, shown as the page
// opens, so an organiser signed in to Google in this browser signs in with one click and no
// popup. It hands back a Google ID token, which Firebase signs in with (auth.ts) the same as
// the Google button. Through the browser's FedCM where it has it (Chrome, Edge); Safari and
// Firefox mostly don't show it, which leaves the button. Needs the Firebase Google provider's
// web client ID in VITE_GOOGLE_CLIENT_ID (.env.example), with the dashboard's origin
// authorised on that client; without it, and against the emulators, nothing is shown.
import { usingEmulators } from './firebase';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

/** The parts of Google Identity Services' `google.accounts.id` this uses. */
interface GoogleId {
	initialize(config: {
		client_id: string;
		callback: (response: { credential: string }) => void;
		login_hint?: string;
		context?: 'signin';
		auto_select?: boolean;
		cancel_on_tap_outside?: boolean;
		itp_support?: boolean;
		use_fedcm_for_prompt?: boolean;
	}): void;
	prompt(): void;
	cancel(): void;
}

declare global {
	interface Window {
		google?: { accounts: { id: GoogleId } };
	}
}

let loading: Promise<GoogleId> | undefined;

function loadGoogleId(): Promise<GoogleId> {
	loading ??= new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.async = true;
		script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error('Google Identity Services missing')));
		script.onerror = () => {
			loading = undefined;
			reject(new Error('Google Identity Services failed to load'));
		};
		document.head.append(script);
	});
	return loading;
}

/**
 * Shows One Tap, if it's set up, calling `onCredential` with the Google ID token when someone
 * chooses an account. `email`, from an invite, makes Google offer that account first. Returns a
 * function that takes the prompt away (when the page goes, or they sign in another way).
 */
export function showOneTap(onCredential: (idToken: string) => void, email?: string): () => void {
	if (!CLIENT_ID || usingEmulators) return () => {};
	let cancelled = false;
	loadGoogleId()
		.then((id) => {
			if (cancelled) return;
			id.initialize({
				client_id: CLIENT_ID,
				callback: ({ credential }) => onCredential(credential),
				login_hint: email || undefined,
				context: 'signin',
				// A tap each time: venue laptops get shared, so nobody is signed in without choosing to be
				auto_select: false,
				cancel_on_tap_outside: true,
				itp_support: true,
				use_fedcm_for_prompt: true,
			});
			id.prompt();
		})
		// Blocked by an extension or the network: the Google button still works
		.catch(() => {});
	return () => {
		cancelled = true;
		window.google?.accounts.id.cancel();
	};
}
