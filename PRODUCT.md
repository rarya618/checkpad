# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Organisers (primary):** volunteers who run community meetups, tech or otherwise, and register people on Bevy, Luma or a similar platform. On the night they're setting up a venue, greeting people and running the program at once, so they use Checkpad in short glances from a laptop or phone. Before and after the event they import lists, set up events and look back at turnout. GDG Sydney is the first team; GDG on Campus UTS is next. GDG is the first customer, not the boundary.
- **Attendees:** arrive at the door, scan a QR code with their own phone camera (or type the short link) and type their email. They've never seen Checkpad before and won't install anything; it has to work first time, on mobile data or venue Wi-Fi.
- **Team members and door volunteers:** check people in by email or ticket number and add walk-ins, without being able to change the event.
- **Roles:** super admin, organiser and team member. Only people with an organiser record can sign in to the dashboard.

## Product Purpose

Checkpad lets attendees check themselves in at a meetup, so nobody queues at a staffed door, and gives organisers a live view of who's arrived. The point is that anyone can walk in easily, registered or not, and their details are recorded. Walk-ins are a core path, not an exception, and they count as attendees everywhere, including in turnout. Success on the night is a door that doesn't bottleneck and counts the organiser trusts; afterwards it's knowing how the night went and how it compares with past events.

Checkpad replaces gdg-check-in, an older app on a different Firebase project (see `docs/migration-plan.md`). It isn't open to new organisers yet: the marketing site collects a waitlist, and super admins invite people from it.

## Positioning

Built for meetup night by volunteer organisers, not as a ticketing platform's afterthought:

- **Attendees check themselves in** on their own phones from a venue QR or printed sign. Staff only handle exceptions.
- **Walk-ins are handled properly:** each gets the next numbered walk-in ticket, with no repeats across devices, and walk-ins are counted separately from registrations.
- **Meetup-night extras:** a prize draw on the projector, a full-screen venue QR display, permanent team links that keep printed signs working across events, and analytics across events.
- **Volunteer-friendly:** no paid-ticketing assumptions. Pricing is undecided, so don't state a price or a "free" claim publicly until it is.

## Operating Context

- Organisers register people on Bevy or Luma, export the attendee CSV and import it into Checkpad; they can import again as more people register (rows are matched by ticket number or Luma guest ID). Exports go back out for Bevy's bulk upload and as an attendance CSV.
- At the venue: the QR shows on a TV or projector, or as a printed sign. Staff use a laptop or phone in the browser. Check-ins queue up offline; adding a walk-in needs a connection.
- Self check-in opens and closes with a manual switch per event. Staff can still check people in while it's closed.
- Teams have permanent links (`checkpad.app/team/<slug>`) that open the team's current or next event, so a sign printed once keeps working.
- The prize draw runs on the projector, so it shows names only.
- Surfaces: the marketing site and attendee check-in at `checkpad.app` (`apps/web`), and the organiser dashboard at `manage.checkpad.app` (`apps/dashboard`).

## Capabilities and Constraints

- Built: self check-in, staff check-in and walk-ins, live attendee table with undo, events with settings and an open/closed switch, share dialog and venue QR display, Bevy and Luma CSV import, Bevy and attendance exports, teams and team links, organiser invites by email, prize draw, event and cross-event analytics, and the waitlist.
- Supported import platforms: Bevy and Luma. Eventbrite, Humanitix, Meetup and generic CSV are planned and must stay marked as planned until they ship.
- Privacy: attendees type their email to check in, and attendee records hold names, emails, job titles, companies and tickets. Never show one attendee's details to another, don't autofill from past events, and keep public screens (venue display, prize draw) to names only. Error reports exclude request bodies and user details.
- Terminology: "organiser", "team member", "walk-in", "check in" (verb) and "check-in" (noun), "event link", "team link". Walk-in tickets use a per-team prefix, e.g. `CPWALKIN0005`.
- Undecided: pricing; attendee table order; one time format everywhere (attendee screens say "6:24pm", the dashboard says "18:24"); the Bevy export's exact columns.

## Brand Commitments

- Name: Checkpad. The logo is in `packages/shared`.
- Voice: plain, concrete and calm. Copy says what happens ("Attendees scan the QR with their phone camera and type their email"), not what it promises. Australian English spelling (organiser, colour).
- The Figma file (Checkpad, linked in `docs/migration-plan.md`) is the source for designed screens.

## Evidence on Hand

- Real product screenshots in `apps/web/src/assets/screens/`.
- The old app's history (14 events, about 2,600 attendees, about 1,040 checked in) and GDG Sydney's use are real, but **nothing may be cited publicly yet**: no customer names, logos, usage numbers or testimonials on public pages until the owner says so. There are no testimonials, case studies or press to draw on.

## Product Principles

1. **The door never waits on Checkpad.** Attendee check-in has to work first time on any phone, with no account or app, in seconds.
2. **Counts organisers can trust.** Live numbers, walk-ins kept separate, undo for mistakes, no duplicate tickets across devices.
3. **Built for a busy volunteer.** Every on-the-night action takes a glance and a tap; setup and review can wait for later.
4. **Attendee privacy by default.** Collect and show only what the moment needs; public screens show names only.
5. **Say only what's true.** Planned features are labelled planned; no invented proof, prices or claims.

## Accessibility & Inclusion

Attendees use their own phones, in all sorts of venue lighting, often in a crowd, and many are first-time visitors, so the check-in flow must work on small and older phones, at large text sizes and with screen readers. Charts never rely on colour alone (legends and labels on every series).
