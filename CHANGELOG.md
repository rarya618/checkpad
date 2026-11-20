# Changelog

Checkpad has one version for the whole product: the dashboard, the check-in site and the check-in API. It follows SemVer: a patch for fixes and polish, a minor version for something new for organisers or attendees, and a major version for a change people have to relearn or redo. `npm run release -- patch | minor | major` moves to the next one and drafts its entry here (scripts/release.mjs).

Each line starts with who the change is for: `[organisers]`, `[attendees]` or `[organisers, attendees]`. The release script drafts lines as `[?]`, and checkpad.app/changelog (apps/web/src/pages/changelog.astro) won't build until each one is tagged.

## 1.4.1 (2026-11-21)

- [organisers] A new event starts at your team's latest venue, and the venue field suggests your team's past venues as you type

## 1.4.0 (2026-11-21)

- [organisers] Analytics shows ticket sales for paid events: your earnings, every amount the platform reported, earnings by ticket type, and how many people using each discount or access code came
- [organisers] The Analytics page compares ticket earnings across events

## 1.3.1 (2026-11-21)

- [organisers] Analytics lays out many ticket types in columns across the page, showing the biggest first with the rest a click away
- [organisers] Turnout by sign-up timing splits registrations made weeks and months ahead, for events that sell tickets early

## 1.3.0 (2026-11-21)

- [organisers] Import attendees from Humanitix as well as Bevy and Luma
- [organisers] Choose to bring in check-ins from the platform's file, at the times it recorded, for events checked in there
- [organisers] Choose to keep every ticket booked under one email, as when one person books for a group
- [organisers] Imports save what each ticket cost, its fees and the codes used, visible to organisers only
- [organisers] Choose which registration questions' answers to import; the event remembers, and points out new questions
- [organisers] A clearer import dialog: options first, then a tally of what the import will do, and you can drop the file on it
- [organisers] The docs show what each platform's import brings in, side by side
- [organisers, attendees] The privacy policy says organisers can see what attendees paid for a ticket

## 1.2.2 (2026-11-21)

- [organisers] Signing in with Google is a clear "Sign in with Google" button again, in Google's own style

## 1.2.1 (2026-11-21)

- [organisers] The sign-in code is in the email's subject, and phones and mail apps offer to fill it in or copy it; one tap selects it in the email

## 1.2.0 (2026-11-21)

- [organisers] Sign in with a 6-digit code from the email, on any device; the link in the same email still works on the device you asked from
- [organisers] New sign-in screens that ask one thing at a time, with clearer messages when a code or address is wrong
- [organisers] New sign-in and invite emails that say who they're for and when, with the code at the top, and read well in dark mode
- [organisers] The invite's button opens sign-in with your address already filled in
- [organisers] Setting up a new team says what's still missing, instead of greying out the button

## 1.1.2 (2026-11-21)

- [organisers, attendees] The changelog's filter is simpler, sits on the timeline's line, and shows a clearer focus ring when you use the keyboard

## 1.1.1 (2026-11-20)

Small fixes behind the scenes.

## 1.1.0 (2026-11-20)

- [organisers, attendees] What's changed in each version is at checkpad.app/changelog, filtered by who a change is for
- [organisers] The version on the dashboard's Profile page links to what changed in it
- [organisers] The docs are a page per topic, grouped by when you need them, with new pages on signing in, what an import reads and what to do when something goes wrong
- [attendees] A help page for checking in, linked from every check-in page
- [organisers, attendees] The privacy policy now says who runs Checkpad

## 1.0.2 (2026-11-20)

- [organisers] Dashboard sign-in emails link to manage.checkpad.app instead of checkpad-app.firebaseapp.com (1.0.1 meant to, but didn't)

## 1.0.1 (2026-11-20)

- [organisers] Google sign-in goes through manage.checkpad.app instead of checkpad-app.firebaseapp.com

## 1.0.0 (2026-11-18)

The first numbered version, of everything live at this point:

- [attendees] Attendees check themselves in from the event link, a QR code or a team link on their own phones, and anyone not on the list can check in as a walk-in with the next walk-in ticket.
- [attendees] Before check-in opens, the event link counts down to the event with Add to calendar and the event's ticket link; on the day, people type their email while they wait and check in with one tap once it opens.
- [organisers] Organisers run events from the dashboard: a live attendee list with undo, staff check-in and walk-ins, an open and closed switch, sharing and the venue QR display, Bevy and Luma imports, Bevy and attendance exports, and a prize draw.
- [organisers] Teams with permanent team links, organiser invites by email, analytics for each event and across events, and the waitlist.
