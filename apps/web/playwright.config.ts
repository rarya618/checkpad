// End-to-end tests for the attendee check-in pages, against the real check-in API in the
// Functions and Firestore emulators. Run from the repo root (see CLAUDE.md):
//   npm run build -w @checkpad/functions
//   PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:exec --project demo-checkpad --only firestore,functions "npm run test:e2e -w @checkpad/web"
import { defineConfig, devices } from '@playwright/test';

// Not 4321, so the tests don't collide with a dev server you already have running
const PORT = 4322;

export default defineConfig({
	testDir: 'e2e',
	// Every test reseeds the one emulator database, so they can't run side by side
	workers: 1,
	forbidOnly: !!process.env.CI,
	use: { baseURL: `http://localhost:${PORT}`, ...devices['Pixel 7'] },
	// --ignore-lock keeps it in the foreground, where Playwright can manage it (Astro otherwise
	// backgrounds itself when an AI agent runs it), and away from a dev server's lock file
	webServer: { command: `npx astro dev --port ${PORT} --ignore-lock`, url: `http://localhost:${PORT}`, reuseExistingServer: false },
});
