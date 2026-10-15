# Checkpad

Event check-in for meetups: attendees check themselves in from a link or QR code, and organisers track arrivals from a dashboard.

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
