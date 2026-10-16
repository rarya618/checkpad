# Checkpad migration plan

As of 16 October 2026 · Russal Arya

## Summary

Checkpad replaces [gdg-check-in](https://github.com/rarya618/gdg-check-in), a React + Vite + Material UI app on Firebase Realtime Database with Google sign-in. Checkpad moves to a new Firebase project, `checkpad-app`; the old project stays up only for redirects, then retires. Checkpad has the attendee flow and the two organiser dashboards built on mock data, but no backend, sign-in, import or settings yet. Every old feature that's being kept now has a design in the [Checkpad Figma file](https://www.figma.com/design/PDbJHFMHYOi45MJd5ro6Lp/Checkpad); cloud credits are dropped.

One issue can't wait for the migration: in the old project, the public check-in page reads attendee lists straight from the database without sign-in, so the live database is probably readable by anyone. Check the live Firebase rules first.

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

- [ ] Read the live rules in the old project's Firebase console (Realtime Database → Rules); the new `checkpad-app` project doesn't fix the old one, which stays live until cutover
- [ ] If `events` is publicly readable, lock it down, and accept that public self-check-in stops until a server function replaces it
- [ ] Turn off the past-event autofill
- [ ] Decide whether the exposure needs a notice to attendees under your privacy obligations

## Feature map

Of the 13 old features, two are built in Checkpad and one partly, nine are designed but not built, and one (cloud credits) is dropped. Everything built runs on mock data. Screen names below are frames in the [Checkpad Figma file](https://www.figma.com/design/PDbJHFMHYOi45MJd5ro6Lp/Checkpad).

| Old feature | Status | Where it lands in Checkpad |
| --- | --- | --- |
| Public self-check-in (`?event=<id>`) | Partly built | `apps/web` `/<slug>`. Ticket number on the confirmation is designed ("Checked in with ticket"), not built. Cloud credits button dropped. Past-event autofill dropped |
| Attendee table: check in, undo, search, counter | Built | Attendees dashboard. Empty and no-results states designed |
| Event list with counts | Built | Events dashboard. Empty state and card ⋮ menu designed |
| Venue QR display (`&display=qr`) | Designed | "QR Code screen", opened from the Share dialog ("Attendees – share") |
| Staff check-in by email, adding walk-ins | Designed | "Check in" (found, already arrived, not found), "Staff check in (mobile)", "Attendees – add walk-in" |
| Create, edit, delete events, open/close, walk-in ticket defaults | Designed | "New event", "Event settings" (the Edit button opens it), "Attendees – delete event" |
| Organisers page | Designed | "Organisers" (people), "Organisers – add organiser", "Organisers – row menu" |
| Sign-in and roles (superadmin, organiser, team member) | Designed | "Sign in" (Google or an emailed sign-in link), "Sign in – check your email", "Sign in – link expired", "No access" |
| Bevy CSV import and export | Designed | Attendees ⋮ menu, "Attendees – import from Bevy", "Attendees – import error". Export downloads directly from the menu, no screen |
| Teams and permanent team links (`?team=<slug>`) | Designed | "Organisers – teams", "Organisers – manage team", "Team has no event (mobile-first)" |
| Merch prize draw | Designed | Full-screen venue display: "Prize draw display" (ready, drawing, winner), opened from the event ⋮ menu |
| Cloud credits link and click tracking | Dropped | — |
| CSV export for Bevy bulk upload | Designed | "Export for Bevy" in the Attendees and Events ⋮ menus |

Also designed, with no old equivalent: "Link not found (mobile-first)" for mistyped links and old event links that can't be redirected, and the Share dialog.

### Design notes

- **Line height:** 1.5× the font size for text up to 24px, 1.2× for 28px and up. The 64px stat numbers on the Attendees page use a 60px line height. `packages/shared/theme.css` still sets every line height to `normal`, so the apps don't match yet.
- **Prize draw:** shows names only on the projector, no emails or ticket numbers. "Not here" drops the person without counting them as a winner and draws again. They stay out of the draw for the rest of the night, unlike the old app's put-back, which returned them to the pool. The display needs an organiser signed in, because it reads the checked-in list.
- **No danger colour:** the palette has no red, so the delete-event button and the import error use the normal blues. Add a danger colour before building them.
- **Not built into the nav:** Analytics is in both sidebars but has no design and no old equivalent.

## Decisions the migration forces

1. **Open/closed: manual switch or time window.** The old app has a manual `open`/`closed` status, and staff can still check people in from the dashboard while it's closed. Checkpad currently opens and closes on the event's start and end times. Old events store only a date, no times. Recommendation: go back to the manual switch, and add automatic opening and closing later if wanted. The designs use the manual switch ("Event settings"). The existing "Check in not open" attendee screen still says "Check-in opens at 5pm", which only works with a time window; its copy needs changing if the switch stays.
2. **Old links and printed QR codes.** Old events are addressed by Firebase IDs (`?event=-Nx…`). Team signs use `?team=<slug>`, which is meant to stay valid indefinitely and always points at the team's current open event. If the old domain or those URL formats stop working, printed signs break. With the move to `checkpad-app`, old links point at the old project's hosting domain, so that hosting stays up and serves only redirects to Checkpad: `?event=<old id>` to the event's new slug, and `?team=<slug>` to the team's current event. That means Checkpad also needs teams and the "current event for this team" rule, plus a table of old event IDs to new slugs. The designs give teams a new permanent link, `checkpad.app/team/<slug>`, which opens the team's event that's open for check-in, or else its next upcoming one; `?team=<slug>` should redirect there.
3. **Walk-in ticket numbers.** The old app assigns `GDGWALKIN0001`, `GDGWALKIN0002`, … with a database transaction, so two devices can't get the same number. Checkpad's mock shows "Walk-in" in the ticket column instead. Recommendation: keep the old numbering. The designs use it.
4. **Attendee table order.** The old table lists checked-in attendees first (by check-in time), then everyone else alphabetically. Checkpad keeps registration order. Pick one.
5. **Time format.** The attendee screens say "6:24pm" and the dashboard says "18:24", both as drawn in Figma. Pick one for everywhere.
6. **Which old features survive.** Decided: keep the prize draw (as a venue display) and the walk-in ticket title and venue defaults (in Event settings); drop cloud credits. The past-event autofill is still recommended to drop and has no design.

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
| `jobTitle`, `company`, `ticketType`, `ticketTitle`, `ticketVenue`, `bevyOrderNumber` | — | Not in Checkpad's types yet; add them or keep them as extra fields so the Bevy export still works |
| `cloudCreditsUrl`, `cloudCreditsClickedAt` | — | Not carried over: cloud credits are dropped |
| `admins`, `teams`, `assignedTeams`, `members` | — | No Checkpad equivalent yet |

Migration script:

1. Export the old project's (`gdg-syd-check-in`) Realtime Database as JSON from the Firebase console.
2. Transform it with a script in this repo: create slugs and IDs, convert dates, map fields, keep the old IDs for redirects.
3. Write it into Firestore in `checkpad-app` with the Admin SDK: a test project or the emulator first, then production.
4. Check counts per event (attendees, checked in, walk-ins) against the old app.
5. Make the old app read-only during cutover, so no check-ins land in the old database after the export.

Sign-in accounts don't move between projects. Neither Google sign-in nor an emailed sign-in link uses passwords, so admins sign in again on `checkpad-app` and get their role from the migrated admins list, matched by email.

## Backend approach

Recommendation: build on the new Firebase project `checkpad-app` with Google sign-in, and stop browsers from reading the database directly. It starts with locked-down rules and no data, and only the old project serves the old app.

- **Database: Firestore, Standard edition, `(default)` database in `australia-southeast1` (Sydney).** Decided 16 October 2026. Rules apply per document and reads never pull in a whole subtree, which rules out the old app's exposure. It can query by email, slug and team; counts are cheap; and live listeners and the offline cache work by default. Enterprise edition was ruled out: live updates are opt-in there, indexes aren't automatic, and storage costs more. The location can't be changed later.

```text
events/{eventId}                     slug, name, description, status, startsAt?, endsAt?, timeZone,
                                     teamIds[], counts {registered, checkedIn, walkIns},
                                     walkInCounter, legacyId
events/{eventId}/attendees/{ticket}  firstName, lastName, email (lowercase), source, checkedInAt,
                                     jobTitle?, company?, ticketType?, ticketTitle?, ticketVenue?,
                                     bevyOrderNumber?
events/{eventId}/draw/{ticket}       result ('won' | 'not-here'), drawnAt, winnerNumber?
admins/{email}                       role, teamId?, invitedAt, invitedBy, lastSignInAt?
teams/{teamId}                       name, slug, globalAccess
```

Bevy imports write in batches of at most 500, so a large import isn't all-or-nothing; it stays safe to re-run because it merges by ticket number.

Prize draw results are saved per event, so a refresh or a second organiser's laptop doesn't lose the winners or redraw someone. The old app kept them only in the browser tab. Anyone in `draw` is out of the pool; Start over deletes the event's `draw` documents. An admin with no `lastSignInAt` shows as "Invited" on the Organisers page.

- **Attendee check-in runs on the server.** One endpoint (an Astro server route, or a Cloud Function) takes an event and an email and returns only what the confirmation screen shows: first name, already-checked-in time and status. It never returns the attendee list.
- **Walk-ins are assigned on the server** with the same transaction on the ticket counter.
- **Database rules deny all public access.** Organisers read and write only through rules that check their role and team, for example from custom claims set when an admin is added. Roles are no longer checked only in React.
- **Slow down email probing:** rate-limit the check-in endpoint per IP and per event.
- **The attendee site moves from fully prebuilt pages to server rendering** for event pages. This also removes the brief blank screen on load, because the server knows whether check-in is open.
- **Hosting:** both apps in `checkpad-app`, either Firebase App Hosting for the Astro site's server rendering plus Firebase Hosting for the dashboard, or a server host for Astro. Decide when the backend work starts.
- **Sign-in:** Google and an emailed sign-in link (Firebase's passwordless email link), no passwords. Keep Firebase's default of one account per email address, so the same person signing in with Google one day and an email link the next stays one user; role checks match by email.
- **Project setup:** enable the Google and Email link sign-in providers, add the Checkpad domains as authorised domains, and keep a separate test project or database for migration test runs.
- **Billing: `checkpad-app` is on the free Spark plan.** Cloud Functions and Firebase App Hosting need the Blaze (pay-as-you-go) plan, so the server-side check-in needs one of: upgrading to Blaze, which likely stays within the free usage at meetup scale but needs a billing account; or hosting the Astro site on another server host that uses the Firebase Admin SDK, which works on Spark. Firestore and Firebase Hosting for the dashboard work on Spark either way. Decide before phase 2.

## Phased plan

1. **Today: rules in the old project.** Check the live rules, lock down public reads, and turn off the autofill.
2. **Backend foundation in `checkpad-app`.** Firestore data model, server check-in endpoint, Firestore rules, Google and email-link sign-in with roles.
3. **Attendee flow on real data.** Wire `apps/web` to the endpoint, add the old-URL redirects and team links.
4. **Dashboards on real data.** Sign-in screen, Events and Attendees pages on live data with live updates.
5. **Build the designed screens.** The designs are done (see the feature map). Event settings with the open/close switch, Bevy import and export, staff check-in (desktop and phone), the QR display and Share dialog, organisers and teams, then the prize draw display. Update the line-height tokens in `theme.css` first.
6. **Data migration.** Run the script against a copy, check the counts, then production.
7. **Cutover.** Point the Checkpad domains at `checkpad-app`, switch the old project's hosting to redirects only, keep the old database read-only for a while, then retire it.

## Open questions

- [ ] What do the live Firebase rules say?
- [ ] Manual open/close, time window, or both? (Designs assume the manual switch)
- [ ] Is the old domain staying, and how many team signs are printed?
- [x] Which features without a design survive? Prize draw and walk-in ticket defaults kept; cloud credits dropped
- [ ] Add a danger colour for delete and error states?
- [ ] Prize draw "Not here": keep the person out for the night (as designed), or return them to the pool like the old app?
- [ ] Design Analytics, or take it out of the sidebar for now?
- [ ] Default start and end times and time zone for migrated events
- [ ] One time format: "6:24pm" or "18:24"?
- [ ] Which attendee table order?
- [ ] Which domain does the old project's hosting use, and how long must its redirects stay up?
- [ ] Upgrade `checkpad-app` to Blaze, or host the Astro site elsewhere?
