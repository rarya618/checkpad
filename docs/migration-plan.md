# Checkpad migration plan

As of 21 October 2026 · Russal Arya

## Summary

Checkpad replaces [gdg-check-in](https://github.com/rarya618/gdg-check-in), a React + Vite + Material UI app on Firebase Realtime Database with Google sign-in. Checkpad moves to a new Firebase project, `checkpad-app`; the old project stays up only for redirects, then retires. Every old feature that's being kept has a design in the [Checkpad Figma file](https://www.figma.com/design/PDbJHFMHYOi45MJd5ro6Lp/Checkpad), and every designed screen is now built, on mock data held in the browser; cloud credits are dropped. What's missing is the backend: no Firestore data, real sign-in, server check-in or old-URL redirects yet (phases 2–4 and 6–7).

One issue can't wait for the migration: the old project's live database rules are fully open, so anyone can read and write every event's attendee list without signing in (checked 18 October 2026). The old app won't be changed before it's retired, so retiring it must also lock down or delete the old database.

Checkpad today is an npm workspaces monorepo:

- `apps/web`: Astro, the marketing site and the attendee check-in flow
- `apps/dashboard`: React + Vite, the organiser dashboard
- `packages/shared`: design tokens, button styles, types, date formatting and the logo

## Urgent: the live app exposes every attendee

Checked on 18 October 2026: the live rules on `gdg-syd-check-in-default-rtdb` are

```json
{ "rules": { ".read": true, ".write": true } }
```

so anyone, signed in or not, can read and write the whole database. A request without sign-in for the top-level keys alone returned `admins`, `events` (14) and `teams`. The rules file in the old repo (`database.rules.json`) denies everything; the live rules were set in the Firebase console and never matched it.

That means anyone can:

- read every event's attendees: names, emails, job titles, companies and tickets
- read the admins list: every organiser's email and role
- add themselves to `admins` as a superadmin and get full access through the old dashboard
- change or delete any event, attendee or team, including the data this plan migrates

**Decision (18 October 2026): the old app won't be changed**, rules included, because it's being retired soon. Retiring the app doesn't close the database, so the retirement must lock down or delete it (see Cutover).

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
- **Roles only in the browser:** the role check lives in React, and the superadmin email is written into `AuthGate.tsx`. The live rules don't check roles, so anyone who can reach the database can edit or delete events and attendees.
- **Open writes:** the rules allow public writes (that's how the check-in page works), so anyone can check in, undo or overwrite any attendee.

What to do:

- [x] Read the live rules: fully open for reads and writes (18 October 2026)
- Not doing: locking down the rules or turning off the past-event autofill; the old app is left unchanged until it's retired
- [ ] Export the old database as JSON soon and keep it private (Data migration, step 1); with open writes, anyone could delete it before the migration
- [ ] When the old app is retired, lock down or delete its database; taking the app down alone leaves the data public
- [ ] Decide whether the exposure needs a notice to attendees under your privacy obligations

## Feature map

All 12 old features that are kept are built in Checkpad; cloud credits are dropped. Everything runs on mock data in the browser: the dashboard keeps events, attendees, organisers, teams and prize draw results in memory, so changes last until the page reloads. Screen names below are frames in the [Checkpad Figma file](https://www.figma.com/design/PDbJHFMHYOi45MJd5ro6Lp/Checkpad).

| Old feature | Status | Where it lands in Checkpad | Still to do |
| --- | --- | --- | --- |
| Public self-check-in (`?event=<id>`) | Built (mock data) | `apps/web` `/<slug>`, with the ticket number on the confirmation ("Checked in with ticket") and "Link not found" for unknown links. Cloud credits button and past-event autofill dropped | Server check-in endpoint (phase 2); redirect from `?event=<old id>` |
| Attendee table: check in, undo, search, counter | Built (mock data) | Attendees dashboard, with the "checked in" toast (Undo), and the empty and no-results states | Live data and updates |
| Event list with counts | Built (mock data) | Events dashboard, with the card ⋮ menu and the empty state | Live data |
| Venue QR display (`&display=qr`) | Built (mock data) | Share dialog (copy link, download the QR as a PNG, open the display) and the full-screen display at `/events/<slug>/display`. The QR codes are generated from the event's link | Opens in a new tab, which starts with fresh mock data until there's a backend |
| Staff check-in by email, adding walk-ins | Built (mock data) | "Check in" page (find by email or ticket: found, already arrived, not found), the walk-in dialog (also from the Attendees page), and on phones the "Staff check in (mobile)" screens with a top bar and slide-in menu | Live data; walk-in numbers need a transaction on the server |
| Create, edit, delete events, open/close, walk-in ticket defaults | Built (mock data) | "New event", "Event settings" (with unsaved changes, leave without saving and the saved toast) and the delete dialog. Changing an event's link moves its attendees and redirects the old link | Decide open/close (Decisions, 1) |
| Organisers page | Built (mock data) | People tab, with add (invite toast), edit, remove and the row menu | Real invites and roles |
| Sign-in and roles (superadmin, organiser, team member) | Built (mock data) | "Sign in", "Check your email", "Link expired", "No access" and the account menu. Every dashboard page and display needs a signed-in organiser. Sign-in is a mock: Google signs in as the super admin, and the development build has a shortcut for the emailed link | Firebase Auth (Google and email link); roles aren't enforced: every organiser can do everything |
| Bevy CSV import and export | Built (mock data) | Import (new, updated, unchanged and skipped rows, matched by ticket number; the "can't read this file" errors; the "import finished" toast with Details) and export, from both ⋮ menus | Confirm the columns Bevy's bulk upload expects; the export's columns are a guess |
| Teams and permanent team links (`?team=<slug>`) | Built (mock data) | Teams tab and Manage team (renaming a team updates its events and members), and `apps/web` `/team/<slug>`, which opens the team's open or next event, or "No event right now" | Redirect from `?team=<slug>` |
| Merch prize draw | Built (mock data) | Full-screen display at `/events/<slug>/prize-draw` (ready, drawing, winner, nobody checked in, everyone has won, start over?), from the event ⋮ menu and the phone menu | Save results per event in Firestore |
| Cloud credits link and click tracking | Dropped | — | — |
| CSV export for Bevy bulk upload | Built (mock data) | "Export for Bevy" in the Attendees and Events ⋮ menus | Same as import: confirm the columns |

Also built, with no old equivalent:

- "Link not found (mobile-first)", for mistyped links and old event links that can't be redirected
- the Share dialog
- toasts for quick confirmations: checked in (with Undo), check-in link copied, import finished (with Details), invite sent and settings saved, on desktop and phones
- "Event settings – unsaved changes" and "Event settings – leave without saving?" (Keep editing, Discard and leave, Save and leave)
- Analytics, from both sidebars:
  - "Event analytics": stat tiles for checked in, pre-registered, walk-ins and the busiest 15 minutes; an arrivals chart of check-ins every 15 minutes (pre-registered and walk-ins stacked); turnout by ticket type
  - "Analytics" (across events): team and time-range filters; stat tiles for events, check-ins, average turnout and returning attendees; a turnout-by-event chart; a table of every event's registered, checked in, turnout and walk-ins. The mock data includes the April to August 2026 meetups so these have history
- the marketing site at `apps/web` `/`

### Design notes

- **Line height:** 1.5× the font size for text up to 24px, 1.2× for 28px and up. The 64px stat numbers on the Attendees page use a 60px line height. The text-size tokens in `packages/shared/theme.css` follow this now; text with a fixed pixel size (`text-[15px]` and the like) still uses the font's normal line height, so older screens don't all match yet.
- **Prize draw:** shows names only on the projector, no emails or ticket numbers. "Not here" drops the person without counting them as a winner and draws again. They stay out of the draw for the rest of the night, unlike the old app's put-back, which returned them to the pool. The display needs an organiser signed in, because it reads the checked-in list.
- **No danger colour:** the palette has no red, so the delete-event button, the remove-organiser button and the import error use the normal blues, as designed. Add a danger colour if they should stand out.
- **Analytics data:** event analytics uses only `checkedInAt`, `source` and Bevy's `ticketType`, which the data model already has. Turnout uses the `counts` on each event. "Returning attendees" needs matching people by email across events, a collection-group query over every event's attendees. It must run on the server or behind organiser-only rules, or it exposes who attended what. Drop that tile from the first build if it's too much.
- **Charts** use the two brand blues for pre-registered and walk-ins, matching the Attendees stats bar, always with a legend and labels so colour isn't the only cue. A palette check found the pair easy to tell apart, colour-blind readers included, but dark blue is darker than chart series usually are and can read as near-black. A third series would need a proper categorical palette.
- **Save changes** in Event settings stays disabled until something changes; the "Unsaved changes" pill shows when it's enabled.
- **Import finished toast:** its Details action reopens the import summary, listing the skipped rows.
- **Phone screens for staff** are drawn taller than the 810px phone frame where content needs it; they scroll, and the recent check-ins list sits below the fold. Below 768px wide the dashboard shows the phone designs at full size; the desktop designs are built at 75% of their Figma size. Pages without phone designs (Attendees, Events, Settings, Organisers, Analytics) don't fit on a phone yet.

## Decisions the migration forces

1. **Open/closed: manual switch or time window.** The old app has a manual `open`/`closed` status, and staff can still check people in from the dashboard while it's closed. Old events store only a date, no times. Recommendation: go back to the manual switch, and add automatic opening and closing later if wanted. Checkpad now does both, inconsistently: the dashboard has the manual switch ("Event settings"), but the attendee site and the Events cards still open and close on the event's start and end times. The "Check in not open" and "Check in closed" attendee screens match the time-based code, in Figma too ("Check-in for September Meetup opens at 5pm, Thu 10 September."); if the switch wins, change that copy along with `apps/web/src/components/CheckInFlow.tsx`.
2. **Old links and printed QR codes.** Old events are addressed by Firebase IDs (`?event=-Nx…`). Team signs use `?team=<slug>`, which is meant to stay valid indefinitely and always points at the team's current open event. If the old domain or those URL formats stop working, printed signs break. With the move to `checkpad-app`, old links point at the old project's hosting domain, so that hosting stays up and serves only redirects to Checkpad: `?event=<old id>` to the event's new slug, and `?team=<slug>` to the team's current event. That means Checkpad also needs teams and the "current event for this team" rule, plus a table of old event IDs to new slugs. The designs give teams a new permanent link, `checkpad.app/team/<slug>`, which opens the team's event that's open for check-in, or else its next upcoming one; `?team=<slug>` should redirect there.
3. **Walk-in ticket numbers.** The old app assigns `GDGWALKIN0001`, `GDGWALKIN0002`, … with a database transaction, so two devices can't get the same number. Decided: keep the old numbering. Checkpad numbers walk-ins this way now, per team prefix; the server must keep the transaction so two devices can't take the same number.
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
| — | `selfWalkIns` | New; `true` for migrated events, matching the old app, where anyone not on the list could add themselves |
| `status` | `status` (new) | Only if the manual switch is kept (decision 1) |
| `description` | `description` | Optional in the old app, required in Checkpad's type |
| `attendees/{ticketNumber}` | `ticket` + `id` | Walk-ins keep `GDGWALKIN####` |
| `source` | `walkIn` | `walkIn = source === 'walk-in'` |
| `checkinDate` (ISO string) | `checkedInAt` (Date) | |
| `jobTitle`, `company`, `ticketType`, `ticketTitle`, `ticketVenue`, `bevyOrderNumber` | — | Not in Checkpad's types yet; add them or keep them as extra fields so the Bevy export still works |
| `cloudCreditsUrl`, `cloudCreditsClickedAt` | — | Not carried over: cloud credits are dropped |
| `admins`, `teams`, `assignedTeams`, `members` | — | No Checkpad equivalent yet |

Migration script:

1. Export the old project's (`gdg-syd-check-in`) Realtime Database as JSON from the Firebase console. Do this early and keep a dated copy: its rules allow anyone to change or delete the data.
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
                                     walkInCounter, selfWalkIns, legacyId
events/{eventId}/attendees/{ticket}  firstName, lastName, email (lowercase), source, checkedInAt,
                                     jobTitle?, company?, ticketType?, ticketTitle?, ticketVenue?,
                                     bevyOrderNumber?
events/{eventId}/draw/{ticket}       result ('won' | 'not-here'), drawnAt, winnerNumber?
admins/{email}                       role, teamId?, invitedAt, invitedBy, lastSignInAt?
teams/{teamId}                       name, slug, globalAccess
```

Bevy imports write in batches of at most 500, so a large import isn't all-or-nothing; it stays safe to re-run because it merges by ticket number.

Prize draw results are saved per event, so a refresh or a second organiser's laptop doesn't lose the winners or redraw someone. The old app kept them only in the browser tab. Anyone in `draw` is out of the pool; Start over deletes the event's `draw` documents. An admin with no `lastSignInAt` shows as "Invited" on the Organisers page.

- **Attendee check-in runs on the server.** One endpoint, a Cloud Function, takes an event and an email and returns only what the confirmation screen shows: first name, already-checked-in time and status. It never returns the attendee list. The same function returns an event's public details (name, description, open or closed) for the check-in page to show when it loads.
- **Walk-ins are assigned on the server** with the same transaction on the ticket counter. The endpoint refuses a self-serve walk-in when the event's `selfWalkIns` is off; staff can always add one from the dashboard.
- **Database rules deny all public access.** Organisers read and write only through rules that check their role and team, for example from custom claims set when an admin is added. Roles are no longer checked only in React.
- **Slow down email probing:** rate-limit the check-in endpoint per IP and per event.
- **The attendee site stays prebuilt (decided 21 October 2026).** One prebuilt check-in page serves every event: Hosting rewrites `/<slug>` and `/team/<slug>` to it, and the page reads the link and asks the endpoint for the event when it loads. Server rendering was the earlier plan and was dropped because:
  - the page loads from Hosting's cache, so a QR scan on venue Wi-Fi isn't held up by a server starting up; only pressing "Check in" waits on the function
  - if the function fails, the page still loads and can tell the attendee to find an organiser
  - security is the same either way, because what protects attendees is check-in running in the endpoint
  - only one function needs the paid plan, not the whole attendee site

  What it costs: a brief loading state while the event loads (instead of the right screen arriving first), and every event link shows the same generic preview in Slack, iMessage and the like. Check-in pages are marked "don't index", so search doesn't matter for them. Astro can server-render individual pages later without changing the rest, so revisit if Checkpad adds pages that need per-event previews or fresh content on arrival, such as public event listings.
- **Hosting:** both apps on Firebase Hosting in `checkpad-app`, as two sites: the dashboard on the default site (`checkpad-app.web.app`) and `apps/web` on a second site with `checkpad.app` pointed at it. The check-in endpoint is a Cloud Function.
- **Sign-in:** Google and an emailed sign-in link (Firebase's passwordless email link), no passwords. Keep Firebase's default of one account per email address, so the same person signing in with Google one day and an email link the next stays one user; role checks match by email.
- **Project setup:** enable the Google and Email link sign-in providers, add the Checkpad domains as authorised domains, and keep a separate test project or database for migration test runs.
- **Billing: `checkpad-app` is on the free Spark plan.** Firebase Hosting (both apps) and Firestore work on Spark. Only the check-in endpoint needs more: Cloud Functions need the Blaze (pay-as-you-go) plan, which likely stays within the free usage at meetup scale but needs a billing account. The alternative is running that one endpoint on another host with the Firebase Admin SDK, which works on Spark. Decide before phase 2.

## Phased plan

1. **The old project.** Rules checked: fully open. Not changing the old app (decision, 18 October 2026); export its data early instead.
2. **Backend foundation in `checkpad-app`.** Firestore data model, server check-in endpoint, Firestore rules, Google and email-link sign-in with roles.
3. **Attendee flow on real data.** Replace the per-event prebuilt pages (`getStaticPaths` over the mock events) with one check-in page and one team page, plus Hosting rewrites; wire them to the endpoint; add the old-URL redirects.
4. **Dashboards on real data.** Sign-in screen, Events and Attendees pages on live data with live updates.
5. **Build the designed screens.** Done ahead of phases 2–4, on mock data (October 2026): every designed screen is built (see the feature map). They move to real data in phases 3 and 4.
6. **Data migration.** Run the script against a copy, check the counts, then production.
7. **Cutover.** Point the Checkpad domains at `checkpad-app`, switch the old project's hosting to redirects only, lock the old database down (it's fully open today), then retire it. The redirects don't need the database, so it can be locked as soon as the data is migrated.

## Open questions

- [x] What do the live Firebase rules say? Fully open for reads and writes; the old app is left unchanged until it's retired
- [ ] Manual open/close, time window, or both? (Designs assume the manual switch)
- [ ] Is the old domain staying, and how many team signs are printed?
- [x] Which features without a design survive? Prize draw and walk-in ticket defaults kept; cloud credits dropped
- [ ] Add a danger colour for delete and error states?
- [ ] Prize draw "Not here": keep the person out for the night (as designed), or return them to the pool like the old app?
- [x] Design Analytics, or take it out of the sidebar for now? Designed
- [ ] Keep "Returning attendees" in the first analytics build, given it needs a cross-event email query?
- [ ] Default start and end times and time zone for migrated events
- [ ] One time format: "6:24pm" or "18:24"?
- [ ] Which attendee table order?
- [ ] Which domain does the old project's hosting use, and how long must its redirects stay up?
- [ ] Upgrade `checkpad-app` to Blaze for the check-in function, or run that one endpoint on another host?
- [x] Server-render the attendee site, or keep it prebuilt? Prebuilt, with one check-in endpoint (21 October 2026)
