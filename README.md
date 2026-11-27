# Checkpad

Event check-in for meetups: attendees check themselves in from a link or QR code, and organisers track arrivals from a dashboard.

## What it does

- **Attendees** check themselves in from the event's link or QR code by typing their email, or sign themselves in as a walk-in when the event allows it.
- **Organisers** watch arrivals come in on the dashboard, check people in by hand, add walk-ins, run the waitlist, see ticket sales and payments, import lists from Bevy, Luma, Humanitix or any CSV, and export the list back out.

<!-- Screenshots to add (not in the repo yet):
![Organiser dashboard](docs/screenshots/dashboard.png)
![Attendee check-in page](docs/screenshots/check-in.png)
-->

## Project structure

```text
/
├── apps/
│   ├── web/          Astro — marketing site and attendee check-in flow
│   └── dashboard/    React + Vite — organiser dashboard
└── packages/
    └── shared/       Design tokens, button styles, types, formatting, logo
```

## Setup

The backend is the Firebase project `checkpad-app`. Before running the dashboard, copy `apps/dashboard/.env.example` to `apps/dashboard/.env.local` and fill in the web app config:

```sh
npx -y firebase-tools@latest apps:sdkconfig WEB 1:677507474751:web:1bdfc84d4db15eec91df8a --project checkpad-app
```

## Commands

Run from the repo root:

| Command                 | Action                                         |
| :---------------------- | :--------------------------------------------- |
| `npm install`           | Installs dependencies for every workspace      |
| `npm run dev:web`       | Starts the Astro site at `localhost:4321`      |
| `npm run dev:dashboard` | Starts the dashboard at `localhost:5173`       |
| `npm run build`         | Builds both apps into their own `dist/` folder |

## Checks

Run from the repo root:

| Command                    | Action                                                   |
| :------------------------- | :------------------------------------------------------- |
| `npm run build`            | Type-checks and builds every workspace                   |
| `npm run test:dashboard`   | Runs the dashboard's unit tests (Vitest)                 |

The functions, security rules and check-in page tests run against the Firebase emulators, which need Java 21:

```sh
npm run build -w @checkpad/functions
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx -y firebase-tools@latest emulators:exec --project demo-checkpad --only auth,firestore,functions "npm test -w @checkpad/functions && npm run test:e2e -w @checkpad/web"
```

## Licence

GNU General Public License v3.0. See [LICENSE](LICENSE).
