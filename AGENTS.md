## Structure

npm workspaces monorepo:

- `apps/web` — Astro: marketing site and the attendee check-in flow
- `apps/dashboard` — React + Vite: the organiser dashboard
- `packages/shared` — design tokens (`theme.css`), button styles, shared types, date formatting and the logo, imported as `@checkpad/shared/...`

Run `npm install` from the repo root only. Add a dependency to one app with `npm install <pkg> -w @checkpad/web` (or `-w @checkpad/dashboard`).

## Firebase

The Firebase project is `checkpad-app` (see `.firebaserc`). Run the CLI as `npx -y firebase-tools@latest …`. The dashboard reads its Firebase config from `apps/dashboard/.env.local` (git-ignored); copy `apps/dashboard/.env.example` and fill it in. The database is Firestore (Standard edition, `australia-southeast1`); the data model is in `docs/migration-plan.md`. The project is on the Blaze plan.

## Development

### apps/web (Astro)

When starting the dev server, use background mode from `apps/web`:

```
cd apps/web && npx astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Event links (`/<slug>`) and team links (`/team/<slug>`) load from the check-in API, which the dev server proxies at `/api` to the Functions emulator in `demo-checkpad`. Start the emulators and fill them with the demo events first (Java 21 as below):

```
npm run build -w @checkpad/functions
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:start --project demo-checkpad --only auth,firestore,functions
npm run seed -w @checkpad/functions
```

The seed script prints the links to try; `attendee@sample.com`, `attendee-2@sample.com` and `jane@example.com` are on every event's list.

The Playwright tests (`apps/web/e2e`) cover the check-in and team pages against the same emulators. They start their own dev server on port 4322 and reseed before every test. Build the functions first, then from the repo root:

```
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:exec --project demo-checkpad --only auth,firestore,functions "npm run test:e2e -w @checkpad/web"
```

The first run on a machine needs Chromium: `npx playwright install chromium` from `apps/web`.

### apps/dashboard (Vite)

```
npm run dev:dashboard
```

That talks to production `checkpad-app`. To work against the emulators instead, start them with Auth too, seed them, then run the dashboard in emulator mode:

```
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:start --project demo-checkpad --only auth,firestore,functions
npm run seed -w @checkpad/functions
npm run dev:emulators -w @checkpad/dashboard
```

Sign in as a seeded organiser (`russal@example.com` super admin, `priya@example.com` organiser, `tom@example.com` team member, `nina@example.com` organiser invited to start a new team, who sees onboarding) with an email link: the emulator sends no email, so "Check your email" shows an "open the link" button instead. Any other email gets "No access".

### functions (Cloud Functions)

The attendee check-in API and the dashboard's emails, served at `/api` on both sites through Hosting rewrites. Build with `npm run build -w @checkpad/functions`. The tests run against the Auth, Firestore and Functions emulators, which need Java 21 (`brew install openjdk@21`; it isn't the default `java`, so put it first on `PATH`):

```
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:exec --project demo-checkpad --only auth,firestore,functions "npm test -w @checkpad/functions"
```

`demo-checkpad` is an emulator-only project, so tests never touch production.

Emails (dashboard sign-in links and organiser invites) go through Resend from `noreply@checkpad.app`. Their templates are in `functions/emails/`, published to Resend and sent by ID (`functions/src/email.ts` says how to update one). Production reads a sending-only key from the `RESEND_API_KEY` secret; the emulators never send, and record each email in the `emulatorOutbox` collection instead.

## Documentation

Full Astro documentation: https://docs.astro.build

Consult these guides before working on related tasks in `apps/web`:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

Vite documentation: https://vite.dev/guide/
