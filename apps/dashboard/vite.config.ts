import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// /api is the check-in API (functions/), which sends sign-in links. Deployed, a Hosting rewrite
// serves it (firebase.json). Locally it's the Functions emulator with VITE_USE_EMULATORS, else
// the live API, which only sends links back to the deployed dashboard: sign in with Google then.
const API = process.env.VITE_USE_EMULATORS
	? { target: 'http://127.0.0.1:5001/demo-checkpad/australia-southeast1/api', rewrite: (path: string) => path.replace(/^\/api/, '') }
	: { target: 'https://checkpad.app' };

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: { '/api': { ...API, changeOrigin: true } },
	},
});
