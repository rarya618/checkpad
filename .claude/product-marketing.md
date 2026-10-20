# Checkpad product marketing context

Read by the copywriting skill before it writes anything (`.claude/skills/copywriting`). Facts here come from the repo, the migration plan and the live marketing page as of 21 October 2026. `[NEED: ...]` marks a gap: fill it in, or leave the claim out of copy.

## The product in one line

Self check-in for community meetups: attendees scan a QR code at the door and type their email, and organisers watch the room fill up on a dashboard.

## Where it came from

Checkpad replaces gdg-check-in, the app GDG Sydney built for its own meetups. The old app's database held 14 events on 18 October 2026 (some may be tests). Attendee lists come from Bevy, the event platform Google Developer Groups use for registration.

- [NEED: how many people have checked in through the old app, and across how many real meetups]
- [NEED: typical turnout for a GDG Sydney meetup (registered vs arrived), from the old data]
- [NEED: the founder story in the founder's own words: why the old app was built and what went wrong at the door before it]

## Who it's for

**Primary:** volunteer organisers of recurring community tech meetups who register attendees on Bevy. Google Developer Group chapters first, since the product grew out of one.

- They run the door themselves, from a laptop or phone (the dashboard has phone screens for staff check-in for this reason).
- Walk-ins turn up, which is why walk-in tickets exist in both the old app and Checkpad.
- They report attendance back to Bevy afterwards (hence "Export for Bevy").
- Assumed, not confirmed: events are free, so many registered people don't come, and the door is run by one or two volunteers. [NEED: confirm both before copy relies on them]

**Secondary:** other community event organisers (the page says "For community event organisers"). [NEED: confirm whether non-Bevy and non-GDG organisers are actually in scope for the waitlist, and which platforms they register people on]

**Not for:** paid ticketing, conferences with badge printing, or events that need payment at the door. Checkpad doesn't sell tickets or take payments. Say so when it helps someone self-select out.

## The problem, in their words

[NEED: real quotes from organisers. Until then, these are the situations the product was built around, described plainly. Don't put them in quote marks as if someone said them.]

- A queue at the desk while someone scrolls a printed list or a spreadsheet for a name.
- People who didn't register turning up, and no clean way to record them.
- Not knowing how many people actually came until someone counts afterwards.
- Picking prize winners from people who already went home.

## What it does today

Status matters: copy can only state as fact what the product does now. Everything below is designed and built, but **it runs on mock data in the browser until the backend ships** (migration plan, phases 2–4). Until then, describe these as what Checkpad does, and don't claim usage numbers, uptime or speed.

| Capability | Status |
|---|---|
| Attendee self check-in: scan the QR or open the link, type email, see a confirmation with their ticket number | Built, mock data |
| Staff check-in by email or ticket number, from a laptop or a phone | Built, mock data |
| Walk-ins get the next ticket number (e.g. GDGWALKIN0005) and are checked in on the spot | Built, mock data. "No two walk-ins get the same ticket" needs the server transaction (phase 2) before it's strictly true |
| Per-event switch for whether attendees can add themselves as walk-ins; staff can always add them | Built, mock data |
| Attendees dashboard: live count, pre-registered vs walk-ins, search, undo | Built, mock data. "Live" and "in seconds" need Firestore live updates (phase 4) |
| Import the attendee CSV from Bevy; export for Bevy's bulk upload | Built. The export's columns are a guess: [NEED: confirm against Bevy's bulk upload] |
| Venue QR display for a screen or printed sign | Built |
| Permanent team link (checkpad.app/team/<slug>) that always opens the team's current or next event | Built, mock data |
| Prize draw on the projector: names only, no repeat winners, "Not here" skips someone | Built. "Saved if you refresh" needs results stored in Firestore (phase 2–4) |
| Event analytics (arrivals every 15 minutes, turnout by ticket type) and analytics across events | Built, mock data |
| Organisers and teams, with sign-in by Google or an emailed link | Screens built; sign-in and roles are mocks |

The prize draw is a nice extra, not a reason people choose Checkpad. Don't lead with it (decided 21 October 2026).

## What makes it different

- **Built for Bevy meetups.** CSV in, check-ins out, matched by ticket number. [NEED: confirm what Bevy's own check-in tools do, so this doesn't overclaim against them]
- **Attendees need nothing.** No app and no account: a QR code and their email.
- **Walk-ins are first-class.** Numbered tickets, counted separately in analytics, and an organiser choice per event about whether people can add themselves.
- **Made by organisers for their own door.** [NEED: founder story to back this up]

[NEED: named alternatives organisers use today (printed list, spreadsheet, Bevy's check-in, Luma, Eventbrite Organizer?) and what each gets wrong for a free meetup]

## Offer and call to action

- Checkpad is not open to new organisers yet. The only call to action is **Join the waitlist** (email only, stored in Firestore).
- Existing organisers use **Sign in**.
- [NEED: price, or "free for community groups", before any copy mentions cost]
- [NEED: what waitlist members get and when (early access date, invite order), before copy promises anything beyond "we'll let you know"]

## Proof available

None yet that can go on the page. Everything in the screenshots is sample data ("September Meetup", 41 of 109 checked in), so never quote those numbers as results.

[NEED: real figures from the old app, an organiser quote with name and chapter, or a logo permission from GDG Sydney]

## Traffic and context

[NEED: where visitors come from (GDG organiser community, word of mouth, social) and what they already know when they arrive]

Attendees also land on checkpad.app when they scan a QR at a venue. The site tells them "At an event? Scan the QR code at the venue." Keep that path obvious.

## Voice

- Plain, practical and calm, like an organiser explaining their setup to another organiser. Professional but friendly.
- Australian English: organisers, colour, recognise.
- Sentence case for headings and buttons. No exclamation marks.
- Short concrete sentences about what happens at the door. Prefer "type their email" to "seamless check-in experience".
- Customer words: door, check in, walk-in, attendee list, turnout, the room filling up, meetup, chapter, Bevy.
- Product name is "Checkpad" in prose (the logo is lowercase "checkpad").
- Times: attendee screens use "6:24pm", the dashboard uses "18:24" (not yet unified, migration plan decision 5).

## Current page (apps/web, for reference)

- Hero: "A real-time self check-in app." / "Save time and effort at the door. Attendees check themselves in on their phone, and you watch the room fill up live."
- Sections: How it works (three steps), Features (six cards), Walk-ins, Analytics, call to action with the waitlist form.
- Known issues the copywriting skill would flag: "Everything for the door, nothing else." is a negation construction; several sections use three-item lists; "real-time" and "live" depend on phase 4.
- The page has no meta description. [NEED: one, once positioning settles]

## Learnings

Angles and claims already tried, and what happened. Add to this as copy ships.

- 21 October 2026: the prize draw had its own page section and menu link; moved to a single feature card because few organisers will use it. Walk-ins took its place.
- 21 October 2026: "Get started" buttons became "Join the waitlist" because Checkpad isn't open yet.
