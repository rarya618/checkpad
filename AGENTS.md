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
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:start --project demo-checkpad --only firestore,functions
npm run seed -w @checkpad/functions
```

The seed script prints the links to try; `attendee@sample.com`, `attendee-2@sample.com` and `jane@example.com` are on every event's list.

### apps/dashboard (Vite)

```
npm run dev:dashboard
```

### functions (Cloud Functions)

The attendee check-in API, served on the Astro site at `/api` through a Hosting rewrite. Build with `npm run build -w @checkpad/functions`. The tests run against the Firestore and Functions emulators, which need Java 21 (`brew install openjdk@21`; it isn't the default `java`, so put it first on `PATH`):

```
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:exec --project demo-checkpad --only firestore,functions "npm test -w @checkpad/functions"
```

`demo-checkpad` is an emulator-only project, so tests never touch production.

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
