# Checkpad product marketing context

Read by the copywriting skill before it writes anything (`.claude/skills/copywriting`). Facts here come from the repo, the migration plan and the live marketing page as of 21 October 2026. `[NEED: ...]` marks a gap: fill it in, or leave the claim out of copy.

## The product in one line

Self check-in for community meetups: attendees scan a QR code when they arrive and type their email, and organisers watch the room fill up on a dashboard.

## Where it came from

Checkpad replaces gdg-check-in, the app GDG Sydney built for its own meetups. GDG Sydney and GDG UTS both use it today. The old app's database held 14 events on 18 October 2026 (some may be tests). Attendee lists come from Bevy, the event platform Google Developer Groups use for registration.

- [NEED: how many people have checked in through the old app, and across how many real meetups]
- [NEED: typical turnout for a GDG Sydney meetup (registered vs arrived), from the old data]
- [NEED: the founder story in the founder's own words: why the old app was built and what went wrong at check-in before it]

## Who it's for

**Primary:** volunteer organisers of recurring community tech meetups who register attendees on Bevy. Google Developer Group chapters first, since the product grew out of one.

- They run check-in themselves, from a laptop or phone (the dashboard has phone screens for staff check-in for this reason).
- Walk-ins turn up, which is why walk-in tickets exist in both the old app and Checkpad.
- They report attendance back to Bevy afterwards (hence "Export for Bevy").
- Assumed, not confirmed: events are free, so many registered people don't come, and check-in is run by one or two volunteers. [NEED: confirm both before copy relies on them]

**Secondary:** other community event organisers (the page says "For community event organisers"). Organisers outside GDG are in scope for the waitlist (confirmed 25 October 2026). Many won't register people on Bevy, the only import today. [NEED: which platforms they register people on]

**Not for:** paid ticketing, conferences with badge printing, or events that need payment on entry. Checkpad doesn't sell tickets or take payments. Say so when it helps someone self-select out.

## The problem, in their words

[NEED: real quotes from organisers. Until then, these are the situations the product was built around, described plainly. Don't put them in quote marks as if someone said them.]

- A queue at the desk while someone scrolls a printed list or a spreadsheet for a name.
- People who didn't register turning up, and no clean way to record them.
- Not knowing how many people actually came until someone counts afterwards.
- Picking prize winners from people who already went home.

## What it does today

Status matters: copy can only state as fact what the product does now. Since 22 October 2026 everything below runs on the real backend (Firestore, Cloud Functions) and is deployed, but no real event has run on it yet. Describe these as what Checkpad does, and don't claim usage numbers, uptime or speed.

| Capability | Status |
|---|---|
| Attendee self check-in: scan the QR or open the link, type email, see a confirmation with their ticket number | Live |
| Staff check-in by email or ticket number, from a laptop or a phone | Live. Built to keep working when venue Wi-Fi drops and save when it's back, but [NEED: test with Wi-Fi off] before copy says so |
| Walk-ins get the next ticket number (e.g. GDGWALKIN0005) and are checked in on the spot | Live. No two walk-ins get the same ticket, even from two devices (a server transaction). Adding one needs a connection |
| Per-event switch for whether attendees can add themselves as walk-ins; staff can always add them | Live |
| Attendees dashboard: live count, pre-registered vs walk-ins, search, undo | Live, with live updates. Still don't claim "in seconds" until it's been timed at a real event |
| Import the attendee CSV from Bevy; export for Bevy's bulk upload | Built. The export's columns are a guess: [NEED: confirm against Bevy's bulk upload] |
| Venue QR display for a screen or printed sign | Built |
| Permanent team link (checkpad.app/team/<slug>) that always opens the team's current or next event | Live |
| Prize draw on the projector: names only, no repeat winners, "Not here" skips someone | Live. Results are saved, so a refresh or a second laptop keeps the winners |
| Event analytics (arrivals every 15 minutes, turnout by ticket type) and analytics across events | Live |
| Organisers and teams, with sign-in by Google or an emailed link | Live. Roles: super admin, organiser (edits the team's events), team member (checks people in, can't change the event). New organisers get an invite email |

The prize draw is a nice extra, not a reason people choose Checkpad. Don't lead with it (decided 21 October 2026).

## What makes it different

- **Built for Bevy meetups.** CSV in, check-ins out, matched by ticket number. [NEED: confirm what Bevy's own check-in tools do, so this doesn't overclaim against them]
- **Attendees need nothing.** No app and no account: a QR code and their email.
- **Walk-ins are first-class.** Numbered tickets, counted separately in analytics, and an organiser choice per event about whether people can add themselves.
- **Made by organisers for their own meetups.** [NEED: founder story to back this up]

[NEED: named alternatives organisers use today (printed list, spreadsheet, Bevy's check-in, Luma, Eventbrite Organizer?) and what each gets wrong for a free meetup]

## Platforms and venues

- **Supported platforms:** Bevy only (CSV import). Planned: Eventbrite, Humanitix, Luma, Meetup and any CSV file. Always label these "Planned" until each import ships; never imply they work today.
- **What a venue needs:** a screen or printed sign for the QR code (it downloads as a PNG), attendees with phones and mobile data or Wi-Fi, and a laptop or phone for staff. Don't claim it works offline: the attendee check-in needs a connection.

## Offer and call to action

- Checkpad is not open to new organisers yet. The only call to action is **Join the waitlist** (email only, stored in Firestore).
- Existing organisers use **Sign in**.
- [NEED: price, or "free for community groups", before any copy mentions cost]
- [NEED: what waitlist members get and when (early access date, invite order), before copy promises anything beyond "we'll let you know"]

## Proof available

- **Used by:** GDG Sydney and GDG UTS run check-in on the original app. The page doesn't name them: the "Used by" section was taken out on 22 October 2026 until they give permission to be named. Don't name either group anywhere that's published (the site, the dashboard or screenshots) until then. Checkpad itself isn't live yet, so once allowed, keep any claim accurate: they use the app Checkpad grew out of. Their logos also need approval from the Google contact. [NEED: permission from GDG Sydney and GDG UTS to be named; logo approval from Google]

Nothing else yet. Everything in the screenshots is sample data ("September Meetup", 41 of 109 checked in), so never quote those numbers as results.

[NEED: real figures from the old app, an organiser quote with name and chapter, or a logo permission from GDG Sydney]

## Traffic and context

[NEED: where visitors come from (GDG organiser community, word of mouth, social) and what they already know when they arrive]

Attendees also land on checkpad.app when they scan a QR at a venue. The site tells them "At an event? Scan the QR code at the venue." Keep that path obvious.

## Voice

- Plain, practical and calm, like an organiser explaining their setup to another organiser. Professional but friendly.
- Australian English: organisers, colour, recognise.
- Sentence case for headings and buttons. No exclamation marks.
- Short concrete sentences about what happens when people arrive. Prefer "type their email" to "seamless check-in experience".
- Customer words: check in, walk-in, attendee list, turnout, the room filling up, meetup, chapter, Bevy.
- Product name is "Checkpad" in prose (the logo is lowercase "checkpad").
- Times: attendee screens use "6:24pm", the dashboard uses "18:24" (not yet unified, migration plan decision 5).

## Current page (apps/web, for reference)

- Hero: "Attendees check themselves in." / "They scan a QR code when they arrive and type their email. You watch the room fill up from your laptop or phone."
- Sections: How it works (three steps), Features (six cards), Walk-ins, Analytics, call to action with the waitlist form.
- "Watch arrivals live" and "A live dashboard" are true since live updates shipped (22 October 2026).
- Meta description: "Attendees check themselves in at your meetup with a QR code and their email. You track arrivals and walk-ins on a dashboard. Join the waitlist."

## Learnings

Angles and claims already tried, and what happened. Add to this as copy ships.

- 21 October 2026: the prize draw had its own page section and menu link; moved to a single feature card because few organisers will use it. Walk-ins took its place.
- 21 October 2026: "Get started" buttons became "Join the waitlist" because Checkpad isn't open yet.
- 21 October 2026, copywriting pass: hero changed from "A real-time self check-in app." (a category label that fails the swap test) to "Attendees check themselves in." "Let attendees check themselves in." was tried and dropped because it broke as "Let attendees / check / themselves in." at desktop width. Removed "in seconds" and "saved if you refresh" until the backend makes them true. Kept "watch the room fill up" and "Know how the night went."
- 21 October 2026: "door" was overused as shorthand for check-in ("Doors open in three steps", "Everything for the door", "Run your next door"). It read oddly. Use it only literally, for where the QR code goes, and at most once on a page. "Door" was never confirmed as an organiser's word; it came from the old page copy.
- 21 October 2026: added Used by (GDG Sydney, GDG UTS, names only), Supported platforms (Bevy supported, five planned) and Supported venues (what a venue needs) sections.
- 22 October 2026, copywriting pass after the backend shipped: no rewrite (the page's voice was already right). Changed only what the new facts allow or require: the prize draw card adds "even after a refresh"; the Teams card names what volunteers can do instead of "share events with co-organisers"; the walk-ins point adds "with no repeats across devices"; the waitlist call to action drops "soon", which promised a timeline we don't have. Offline staff check-in left out until it's tested with Wi-Fi off.
- 22 October 2026: removed the Used by section until GDG Sydney and GDG UTS give permission to be named.
