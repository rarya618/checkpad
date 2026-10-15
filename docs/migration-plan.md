# Checkpad migration plan

As of 16 October 2026 · Russal Arya

## Summary

Checkpad replaces [gdg-check-in](https://github.com/rarya618/gdg-check-in), a React + Vite + Material UI app on Firebase Realtime Database with Google sign-in. Checkpad has the attendee flow and the two organiser dashboards built on mock data, but no backend, sign-in, import or settings yet, and several old features have no design.

One issue can't wait for the migration: the old public check-in page reads attendee lists straight from the database without sign-in, so the live database is probably readable by anyone. Check the live Firebase rules first.

Checkpad today is an npm workspaces monorepo:

- `apps/web`: Astro, the marketing site and the attendee check-in flow
- `apps/dashboard`: React + Vite, the organiser dashboard
- `packages/shared`: design tokens, button styles, types, date formatting and the logo

## Urgent: the live app may expose every attendee

If the public page works, the live database rules let anyone who isn't signed in read every event's attendee list. The rules file in the repo (`database.rules.json`) denies everything and has never changed since it was added, so the live rules must have been set in the Firebase console. That can't be confirmed from the repo alone.

What the public page (`?event=<id>`, no sign-in) does from the browser:

| Step | Function | What it touches |
| --- | --- | --- |
| Load the event | `get(events/<id>)` | Reads the event, including every attendee under it |
| Look up an email | `findAttendeeByEmail` | Reads the event's full attendee list and searches it in the browser |
| Email not found | `findAttendeeInAnyEvent` | Reads every event and every attendee, to autofill a name |
| Check in | `markCheckedIn`, `checkInAttendee` | Writes straight to the database |

Attendee records hold first and last name, email, job title, company and ticket details. The Firebase settings in the public site's code are enough to connect to the database directly.

Related problems:

- **Name lookup by email:** the "Is this still you?" autofill shows a past attendee's name to anyone who types in their email.
- **Roles only in the browser:** the role check lives in React, and the superadmin email is written into `AuthGate.tsx`. Unless the live rules check roles, anyone who can reach the database can edit or delete events and attendees.
- **Open writes:** if the rules allow public writes so the check-in page works, anyone can check in, undo or overwrite any attendee.

What to do today:

- [ ] Read the live rules in the Firebase console (Realtime Database → Rules)
- [ ] If `events` is publicly readable, lock it down, and accept that public self-check-in stops until a server function replaces it
- [ ] Turn off the past-event autofill
- [ ] Decide whether the exposure needs a notice to attendees under your privacy obligations

## Feature map

Of the 13 old features, two are built in Checkpad and one partly, four are designed but not built, and six have no design yet. Everything built runs on mock data.

| Old feature | Status | Where it lands in Checkpad |
| --- | --- | --- |
| Public self-check-in (`?event=<id>`) | Partly built | `apps/web` `/<slug>`. Missing: ticket number on the confirmation, cloud credits button. Past-event autofill should be dropped |
| Attendee table: check in, undo, search, counter | Built | Attendees dashboard |
| Event list with counts | Built | Events dashboard |
| Venue QR display (`&display=qr`) | Designed only | Figma "QR Code screen" |
| Staff check-in by email, adding walk-ins | Designed only | "Check in" sidebar item and "Add attendee" button, no screens |
| Create, edit, delete events, open/close, walk-in ticket defaults | Designed only | "New event", "Edit" and "Settings" placeholders |
| Organisers page | Designed only | Sidebar item only |
| Google sign-in and roles (superadmin, organiser, team member) | Not designed | Only the "Super admin" label exists |
| Bevy CSV import and export | Not designed | Nothing yet |
| Teams and permanent team links (`?team=<slug>`) | Not designed | Nothing yet |
| Merch prize draw | Not designed | Nothing yet |
| Cloud credits link and click tracking | Not designed | Nothing yet |
| CSV export for Bevy bulk upload | Not designed | Nothing yet |

## Decisions the migration forces

1. **Open/closed: manual switch or time window.** The old app has a manual `open`/`closed` status, and staff can still check people in from the dashboard while it's closed. Checkpad currently opens and closes on the event's start and end times. Old events store only a date, no times. Recommendation: go back to the manual switch, and add automatic opening and closing later if wanted.
2. **Old links and printed QR codes.** Old events are addressed by Firebase IDs (`?event=-Nx…`). Team signs use `?team=<slug>`, which is meant to stay valid indefinitely and always points at the team's current open event. If the old domain or those URL formats stop working, printed signs break. Either keep the old hosting up and forwarding, or have the new site redirect both URL formats. That means Checkpad also needs teams and the "current event for this team" rule.
3. **Walk-in ticket numbers.** The old app assigns `GDGWALKIN0001`, `GDGWALKIN0002`, … with a database transaction, so two devices can't get the same number. Checkpad's mock shows "Walk-in" in the ticket column instead. Recommendation: keep the old numbering.
4. **Attendee table order.** The old table lists checked-in attendees first (by check-in time), then everyone else alphabetically. Checkpad keeps registration order. Pick one.
5. **Time format.** The attendee screens say "6:24pm" and the dashboard says "18:24", both as drawn in Figma. Pick one for everywhere.
6. **Features with no design.** Decide which of these survive: the prize draw, cloud credits, the walk-in ticket title and venue defaults, and the past-event autofill (recommended: drop).

## Data model and migration

Old Realtime Database layout:

```text
admins/{emailKey}            email, role, addedAt, teamId?
events/{eventId}             name, date (YYYY-MM-DD), description?, status, createdAt,
                             cloudCreditsUrl?, walkInTicketTitle?, walkInTicketVenue?
  attendees/{ticketNumber}   firstName, lastName, email, source ('bevy' | 'walk-in'),
                             checkinDate?, cloudCreditsClickedAt?, jobTitle?, company?,
                             ticketType?, ticketTitle?, ticketVenue?, bevyOrderNumber?
  ticketCounter              integer for walk-in numbers
  assignedTeams/{teamId}     true
teams/{teamId}               name, slug?, createdAt, globalAccess?
  members/{emailKey}         true
```

Email keys replace `.` with `,`, because Realtime Database doesn't allow dots in keys.

How the old fields map to Checkpad's types (`packages/shared/src/events.ts` and `attendees.ts`):

| Old field | Checkpad field | Note |
| --- | --- | --- |
| `events/{id}` key | `id` (new) + `slug` | Generate the slug from the name, unique; keep the old ID for redirects |
| `date` | `startsAt`, `endsAt` | Old events have no times: pick a default (e.g. 17:00–20:00) or leave them blank |
| — | `timeZone` | New; default `Australia/Sydney` unless events run elsewhere |
| `status` | `status` (new) | Only if the manual switch is kept (decision 1) |
| `description` | `description` | Optional in the old app, required in Checkpad's type |
| `attendees/{ticketNumber}` | `ticket` + `id` | Walk-ins keep `GDGWALKIN####` |
| `source` | `walkIn` | `walkIn = source === 'walk-in'` |
| `checkinDate` (ISO string) | `checkedInAt` (Date) | |
| `jobTitle`, `company`, `ticketType`, `ticketTitle`, `ticketVenue`, `bevyOrderNumber`, `cloudCreditsClickedAt` | — | Not in Checkpad's types yet; add them or keep them as extra fields so the Bevy export still works |
| `admins`, `teams`, `assignedTeams`, `members` | — | No Checkpad equivalent yet |

Migration script:

1. Export the Realtime Database as JSON from the Firebase console.
2. Transform it with a script in this repo: create slugs and IDs, convert dates, map fields, keep the old IDs for redirects.
3. Load it into the new backend, test first, then production.
4. Check counts per event (attendees, checked in, walk-ins) against the old app.
5. Make the old app read-only during cutover, so no check-ins land in the old database after the export.

## Backend approach

Recommendation: stay on Firebase, so the data and Google sign-in carry over, but stop browsers from reading the database directly.

- **Attendee check-in runs on the server.** One endpoint (an Astro server route, or a Cloud Function) takes an event and an email and returns only what the confirmation screen shows: first name, already-checked-in time and status. It never returns the attendee list.
- **Walk-ins are assigned on the server** with the same transaction on the ticket counter.
- **Database rules deny all public access.** Organisers read and write only through rules that check their role and team, for example from custom claims set when an admin is added. Roles are no longer checked only in React.
- **Slow down email probing:** rate-limit the check-in endpoint per IP and per event.
- **The attendee site moves from fully prebuilt pages to server rendering** for event pages. This also removes the brief blank screen on load, because the server knows whether check-in is open.
- **Hosting:** one Firebase project for both apps, or Firebase Hosting for the dashboard plus a server host for Astro. Decide when the backend work starts.

## Phased plan

1. **Today: rules.** Check the live rules, lock down public reads, and turn off the autofill.
2. **Backend foundation.** Data model, server check-in endpoint, database rules, Google sign-in with roles.
3. **Attendee flow on real data.** Wire `apps/web` to the endpoint, add the old-URL redirects and team links.
4. **Dashboards on real data.** Sign-in screen, Events and Attendees pages on live data with live updates.
5. **Design and build the missing screens.** Event settings with the open/close switch, Bevy import and export, staff check-in, the QR display, organisers and teams, then the prize draw and cloud credits if kept.
6. **Data migration.** Run the script against a copy, check the counts, then production.
7. **Cutover.** Point the domains at Checkpad, keep the old app read-only for a while, then retire it.

## Open questions

- [ ] What do the live Firebase rules say?
- [ ] Manual open/close, time window, or both?
- [ ] Is the old domain staying, and how many team signs are printed?
- [ ] Which features without a design survive (prize draw, cloud credits, walk-in ticket defaults)?
- [ ] Default start and end times and time zone for migrated events
- [ ] One time format: "6:24pm" or "18:24"?
- [ ] Which attendee table order?
- [ ] Firestore or Realtime Database for the new backend? Realtime Database makes migration simplest
