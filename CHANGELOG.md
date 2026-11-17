# Changelog

Checkpad has one version for the whole product: the dashboard, the check-in site and the check-in API. It follows SemVer: a patch for fixes and polish, a minor version for something new for organisers or attendees, and a major version for a change people have to relearn or redo. `npm run release -- patch | minor | major` moves to the next one and drafts its entry here (scripts/release.mjs).

## 1.0.0 (2026-11-18)

The first numbered version, of everything live at this point:

- Attendees check themselves in from the event link, a QR code or a team link on their own phones, and anyone not on the list can check in as a walk-in with the next walk-in ticket.
- Before check-in opens, the event link counts down to the event with Add to calendar and the event's ticket link; on the day, people type their email while they wait and check in with one tap once it opens.
- Organisers run events from the dashboard: a live attendee list with undo, staff check-in and walk-ins, an open and closed switch, sharing and the venue QR display, Bevy and Luma imports, Bevy and attendance exports, and a prize draw.
- Teams with permanent team links, organiser invites by email, analytics for each event and across events, and the waitlist.
