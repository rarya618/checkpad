## Structure

npm workspaces monorepo:

- `apps/web` — Astro: marketing site and the attendee check-in flow
- `apps/dashboard` — React + Vite: the organiser dashboard
- `packages/shared` — design tokens (`theme.css`), button styles, shared types, date formatting and the logo, imported as `@checkpad/shared/...`

Run `npm install` from the repo root only. Add a dependency to one app with `npm install <pkg> -w @checkpad/web` (or `-w @checkpad/dashboard`).

## Firebase

The Firebase project is `checkpad-app` (see `.firebaserc`). Run the CLI as `npx -y firebase-tools@latest …`. The dashboard reads its Firebase config from `apps/dashboard/.env.local` (git-ignored); copy `apps/dashboard/.env.example` and fill it in. No database is set up yet: Firestore vs Realtime Database is still open in `docs/migration-plan.md`.

## Development

### apps/web (Astro)

When starting the dev server, use background mode from `apps/web`:

```
cd apps/web && npx astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

### apps/dashboard (Vite)

```
npm run dev:dashboard
```

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
