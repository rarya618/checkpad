import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Checkpad's one version, from the root package.json (scripts/release.mjs moves it): shown on
// Profile and sent to Sentry with every error
const VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;

// /api is the check-in API (functions/), which sends sign-in links. Deployed, a Hosting rewrite
// serves it (firebase.json). Locally it's the Functions emulator with VITE_USE_EMULATORS, else
// the live API, which only sends links back to the deployed dashboard: sign in with Google then.
const API = process.env.VITE_USE_EMULATORS
	? { target: 'http://127.0.0.1:5001/demo-checkpad/australia-southeast1/api', rewrite: (path: string) => path.replace(/^\/api/, '') }
	: { target: 'https://checkpad.app' };

export default defineConfig({
	plugins: [react(), tailwindcss()],
	define: { 'import.meta.env.VITE_CHECKPAD_VERSION': JSON.stringify(VERSION) },
	build: {
		// Firestore alone is about 650KB (190KB compressed), and almost every page needs it
		chunkSizeWarningLimit: 700,
		rolldownOptions: {
			output: {
				// The libraries get files of their own. They rarely change, so phones keep them cached
				// (Hosting caches /assets/ for a year) and a deploy only re-downloads the app's code.
				// Libraries only some pages use (QR codes, CSV) stay with those pages.
				codeSplitting: {
					groups: [
						{ name: 'firebase', test: /node_modules[\\/](@firebase|firebase|re2js)[\\/]/ },
						{ name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler|cookie|set-cookie-parser)[\\/]/ },
					],
				},
			},
		},
	},
	server: {
		proxy: { '/api': { ...API, changeOrigin: true } },
	},
});
