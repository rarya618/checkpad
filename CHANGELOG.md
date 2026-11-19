# Changelog

Checkpad has one version for the whole product: the dashboard, the check-in site and the check-in API. It follows SemVer: a patch for fixes and polish, a minor version for something new for organisers or attendees, and a major version for a change people have to relearn or redo. `npm run release -- patch | minor | major` moves to the next one and drafts its entry here (scripts/release.mjs).

Each line starts with who the change is for: `[organisers]`, `[attendees]` or `[organisers, attendees]`. The release script drafts lines as `[?]`, and checkpad.app/changelog (apps/web/src/pages/changelog.astro) won't build until each one is tagged.

## 1.1.1 (2026-11-20)

- [organisers, attendees] The terms of use planned for 1.1.0 are held back until they've been reviewed

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
