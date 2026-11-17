---
name: Checkpad
description: Self check-in for community meetups. Attendees check themselves in on their own phones; organisers watch arrivals live.
colors:
  dark-blue: "#112d4e"
  med-blue: "#3f72af"
  light-blue: "#dbe2ef"
  off-white: "#f9f7f7"
  white: "#ffffff"
  error: "#b3261e"
  dark-blue-hover: "#1c3d65"
  light-blue-hover: "#bbcbe3"
  med-blue-hover: "#5b86bb"
  line: "rgb(17 45 78 / 0.12)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body-lead:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  ticket-mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.5
  page-title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  card-title:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  help:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  status:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.025em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  4xl: "32px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "14": "56px"
  "20": "80px"
  "28": "112px"
components:
  button-primary:
    backgroundColor: "{colors.dark-blue}"
    textColor: "{colors.off-white}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "6px 24px"
  button-primary-hover:
    backgroundColor: "{colors.dark-blue-hover}"
  button-secondary:
    backgroundColor: "{colors.light-blue}"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.lg}"
    padding: "6px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.light-blue-hover}"
  button-accent:
    backgroundColor: "{colors.med-blue}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.lg}"
    padding: "6px 24px"
  button-accent-hover:
    backgroundColor: "{colors.med-blue-hover}"
  button-tall:
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-lg:
    rounded: "{rounded.xl}"
    padding: "12px 40px"
  button-sm:
    rounded: "{rounded.md}"
    padding: "8px 24px"
  input-on-light:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
  input-on-dark:
    backgroundColor: "{colors.off-white}"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.xl}"
    padding: "10px 20px"
  chip-supported:
    backgroundColor: "{colors.dark-blue}"
    textColor: "{colors.off-white}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  chip-planned:
    backgroundColor: "{colors.light-blue}"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  feature-tile:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.3xl}"
    padding: "32px"
  feature-tile-dark:
    backgroundColor: "{colors.dark-blue}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.3xl}"
    padding: "32px"
  closing-band:
    backgroundColor: "{colors.dark-blue}"
    textColor: "{colors.off-white}"
    rounded: "{rounded.3xl}"
  dashboard-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.xl}"
    padding: "20px 24px"
  event-card-live:
    backgroundColor: "rgb(219 226 239 / 0.4)"
    textColor: "{colors.dark-blue}"
    rounded: "{rounded.xl}"
    padding: "24px 28px"
  event-row:
    backgroundColor: "{colors.white}"
    textColor: "{colors.dark-blue}"
    padding: "16px 16px 16px 20px"
  check-in-bar:
    backgroundColor: "{colors.light-blue}"
    rounded: "{rounded.full}"
    height: "8px"
  check-in-bar-thin:
    backgroundColor: "{colors.light-blue}"
    rounded: "{rounded.full}"
    height: "6px"
  status-indicator-open:
    textColor: "{colors.dark-blue}"
    typography: "{typography.status}"
  status-indicator-closed:
    textColor: "rgb(17 45 78 / 0.6)"
    typography: "{typography.status}"
    padding: "56px 28px"
---

# Design System: Checkpad

## Overview

**Creative North Star: "The Well-Run Door"**

Checkpad's system is one small, fixed palette of navy and blues on an off-white ground, set entirely in Plus Jakarta Sans. It is shared by every surface: the marketing site and the attendee check-in page (`apps/web`) and the organiser dashboard (`apps/dashboard`), all importing the same tokens from `packages/shared/theme.css` and the same button recipe from `packages/shared/src/button.ts`. The home page is the marketing expression of that system; the check-in page is its most pared-back one; the dashboard is its densest.

The mood is calm, plain and capable: a volunteer at a busy venue should read any screen at a glance. Depth is soft and navy-tinted, never grey or hard-edged. The product itself is the imagery: real dashboard and phone screenshots sit in thin light-blue frames, cropped on the part that matters and faded where the app carries on. Navy is used as a solid surface sparingly (one closing band on the home page, one dark feature tile, the sample-arrival toast) so it reads as emphasis.

The user pinned the logo and the five colours; they are not up for reinterpretation.

**Key Characteristics:**
- Five pinned colours (navy, med-blue, light-blue, off-white, error) plus white for raised surfaces.
- One typeface, Plus Jakarta Sans, with ExtraBold (800) tightened display for headings and button labels.
- Spacing, radius, leading and font size always on Tailwind's standard scale.
- Real product screenshots, framed and cropped, in place of illustration or icon tiles.
- Soft, long, navy-tinted shadows; flat everywhere else.
- Quick, eased entrances that respect reduced motion.

## Colors

A cool, low-saturation navy-and-blue palette on a warm off-white, with a single red reserved for errors.

### Primary
- **Harbour Navy** (`dark-blue`): the ink of the system. All body text and headings, the primary button fill, solid emphasis surfaces (the closing band, the dark feature tile, the arrival toast, the phone bezel in the hero). Secondary text is the same navy at reduced opacity (80% for supporting copy, 70% for hints and placeholders) rather than a separate grey.

### Secondary
- **Signal Blue** (`med-blue`): accents and links. Link hover colour, step ordinals, check marks in lists, the check badge on the arrival toast, footer column headings, the accent button on navy (prize draw), the bezel of the staff phone on the dark tile, focus outlines on light grounds.

### Tertiary
- **Mist Blue** (`light-blue`): quiet fields and lines. Secondary button fill, planned-platform chips, the band behind the hero product shot, every hairline border and divider (frames, tiles, header on scroll, footer, section rules), text selection, and secondary text on navy.

### Neutral
- **Paper** (`off-white`): the page ground on every surface, and text on navy.
- **White** (`white`, Tailwind's own): raised surfaces that sit on Paper: screenshot frames, feature tiles, the light-tone waitlist input, the check-in card.
- **Alarm Red** (`error`): error text and the invalid-field ring only.

Hover fills are derived, not chosen: each is the base colour mixed in OKLab towards med-blue (navy 25%, light-blue 20%) or, for med-blue itself, towards off-white (15%). The hex values in the frontmatter approximate those `color-mix()` expressions, which remain the source in `theme.css`.

### Named Rules
**The Pinned Palette Rule.** No new hues. Every colour on any surface is one of the five pinned tokens, white, a derived hover mix, or navy at an opacity. New states are made from these, never from a new swatch.

**The Navy-Grey Rule.** There is no grey. Muted text is navy at 70-85% opacity; muted lines are light-blue.

## Typography

**Display Font:** Plus Jakarta Sans (variable, 200-800, loaded through Astro's font API as `--font-jakarta`; the dashboard defines the same variable)
**Body Font:** Plus Jakarta Sans
**Label/Mono Font:** Geist Mono, only for walk-in ticket numbers on the check-in confirmation

**Character:** A friendly geometric grotesque used at two extremes: ExtraBold and slightly tightened for anything that is a heading or a button, regular weight for reading. The contrast between the two does the hierarchy work, so the ramp stays short.

### Hierarchy
- **Display** (800, 3rem mobile to 3.75rem tablet to 4.5rem desktop, line-height 1.2, tracking -0.025em): the hero headline only.
- **Headline** (800, 1.875rem to 3rem, 1.2): section headings and the closing band.
- **Title** (800, 1.25rem to 1.875rem, 1.5 up to 24px and 1.2 from 30px): feature tile and step headings, list terms, the mobile menu links (1.875rem). Button labels use this weight at their size's text step.
- **Body lead** (400, 1.125rem to 1.25rem, 1.5): the paragraph under a display or section heading, max about 42rem.
- **Body** (400, 1rem, 1.5): all running copy; tile copy capped at about 36rem.
- **Label** (500-600, 0.875rem, 1.5): chips, footer headings, small print under the hero form, toast secondary line (0.75rem on phones).

### Dashboard hierarchy
The dashboard is read in glances, so each role keeps one size everywhere and each heading level sits a visible step below the one above it:
- **Page title** (800, 1.5rem phones, 1.875rem desktop): Events, Organisers, Analytics, and the event's name on its pages.
- **Event section** (800, 1.5rem): Attendees, Check in, Analytics and Settings under the event's name.
- **Analytics section** (800, 1.25rem): Turnout, Registrations, Arrivals, Audience.
- **Card title** (800, 1.125rem to 1.25rem): card and tile headings, attendee names on Check in.
- **Body** (400, 0.875rem to 1rem, 1.5): names, emails, table cells, inputs.
- **Help** (400, 0.875rem, med-blue): field hints and any explanation a sentence long. 0.75rem is only for single-line metadata: arrival times, badges, chart labels, table counts.

All dashboard text is navy, with med-blue for secondary text; never black. Counts, times and percentages use tabular figures so they don't shift as they change.

Line heights follow the Figma rule written into `theme.css`: 1.5 for sizes up to 24px, 1.2 from 30px up. Bold and semibold text is tightened to `--tracking-tight` like the display style.

### Named Rules
**The Two-Weight Rule.** Headings and button labels are ExtraBold display; everything else is regular, medium or semibold body. No light weights, no second family for headings.

**The Clean Heading Rule.** A heading stands on its own: no eyebrow or kicker label above it. On the home page, display and section headings end without a full stop.

## Layout

Mobile-first, single column, widening to grids at `md` (48rem) and the desktop layout at `xl`. In `apps/web` the `xl` breakpoint is redefined to 64rem, because from 64rem up the whole public site renders at 90% zoom (`--page-zoom` on `body`); a 1024px window therefore gives the layout about 1138px. Buttons cancel the zoom so they stay full size, and full-height regions use `h-viewport` / `min-h-viewport` instead of `dvh` units. A separate `nav` breakpoint (72rem) decides when the header shows its links instead of the menu button.

- **Container:** centred, max 1280px, 24px gutters on phones and 48px from `md`. The header and footer use a wider 1440px container with 120px desktop gutters.
- **Section rhythm:** 80px vertical padding, 112px at desktop; 40px between a section heading and its content, 56px at desktop.
- **Grids:** three equal columns for steps and venue needs (gap 32-40px); a six-column bento for features (gap 16px, 24px at desktop) with tiles spanning 4+2 and then the full width.
- **Fixed sizes may be custom:** container widths, screenshot crops, positions, bezel widths and shadows use exact values; spacing, radius, leading and font size never do.

Section anchors carry a `scroll-margin-top` equal to the sticky header's height (85px, 99px at desktop).

## Elevation & Depth

A hybrid: surfaces are flat and separated by light-blue hairlines, and only framed product imagery and floating moments lift. Shadows are always long, soft, negatively spread and tinted with navy (`rgb(17 45 78 / …)`), so depth reads as ambient light under the product rather than as an outline.

### Shadow Vocabulary
- **Screenshot frame** (`0 24px 60px -12px rgb(17 45 78 / 0.18)`): the hero dashboard frame.
- **Feature tile** (`0 16px 40px -16px rgb(17 45 78 / 0.2)`): bento tiles.
- **Device** (`0 24px 48px -8px rgb(17 45 78 / 0.35)`): the attendee phone over the dashboard.
- **Floating toast** (`0 16px 40px -8px rgb(17 45 78 / 0.45)`): the navy sample-arrival notification.

The dashboard uses a tighter family on the same navy tint (for example `0 9px 30px rgb(17 45 78 / 0.18)` for popovers and `0 4.5px 12px rgb(17 45 78 / 0.14)` for small raised controls).

### Named Rules
**The Navy Light Rule.** Every shadow is tinted with navy and softly spread. No black or grey shadows, and no hard offset shadows.

**The Product-Lifts Rule.** Elevation is for framed product imagery and floating moments (device, toast, popover). Text sections and lists stay flat and use hairlines.

**The Quiet Edge Rule.** In the dashboard, cards, panels, lists, menus, tooltips and the sidebar are edged with the `line` token: navy at 12% opacity, a hairline that sits back on white, off-white and the tinted live card alike, so the content inside reads first. Form controls (search boxes, selects, drop zones) keep stronger edges, since their outline is how you spot them, and so do chart marks. Tables and lists (attendees, organisers, waitlist, the Events page's rows) share one pattern: a white box with that hairline, and light-blue dividers between rows.

**The Visible Focus Rule.** Keyboard focus is a 2px med-blue ring, 2px clear of the element, everywhere in the dashboard; on the prize draw's navy screen it turns light blue. Fields that draw their own focus outline keep it.

## Shapes

Generously rounded and concentric: the radius grows with the size of the thing. Small controls use 6-8px, inputs and toasts 12px, screenshot frames 16px, tiles and the closing band 24px (32px for the band at desktop and for device bezels), and chips and badges are fully round. Borders are 1px light-blue hairlines on white surfaces; content dividers between steps and venue needs are 2px light-blue top rules. Cropped screenshots round only the corner they enter from (top-left, 16px) and fade out on the right and bottom edges with a mask, so they read as a window into the app. Device frames are solid navy (hero) or med-blue (dark tile) bezels, 5-6px thick.

## Components

### Buttons
Solid, compact and confident, with an ExtraBold label.
- **Shape:** gently rounded (8px) at the standard and tall sizes, 6px for the small table size, 12px for the large phone size.
- **Primary:** navy fill, off-white label. The default action on light grounds (Join the waitlist in the header and hero form).
- **Secondary:** light-blue fill, navy label. Sign in; the waitlist button on the navy closing band.
- **Accent:** med-blue fill, off-white label. Only as the main action on a navy surface (prize draw).
- **Sizes:** `md` 6px/24px padding at 1rem (default), `sm` 8px/24px at 0.875rem (table rows), `tall` 12px/24px at 1.125rem (attendee check-in, about 50px tall), `lg` 12px/40px at 1.5rem (phone screens).
- **Hover / Focus:** colour transition to the derived hover fill, only on hover-capable devices and never when disabled. Disabled shows a not-allowed cursor. On the check-in page buttons press in to 97% scale on tap.
- **Loading:** the label stays in place invisibly and a 20px ring spinner covers it, so the button never changes size.

### Chips
- **Style:** fully round, 4px/12px padding, 0.875rem. A supported item is a navy chip with a small check and semibold label; a planned item is a light-blue chip with "· planned" in 70% navy.
- **State:** chips are informational, not interactive.

### Cards / Containers
- **Corner Style:** 24px for feature tiles and the closing band, 16px for screenshot frames, 12px for the check-in card.
- **Background:** white on the off-white ground; navy for the one dark tile and the closing band.
- **Shadow Strategy:** feature tile or screenshot frame shadow (see Elevation & Depth).
- **Border:** 1px light-blue (navy on the dark tile).
- **Internal Padding:** 32px, 40-48px at desktop; screenshots bleed off the tile's bottom and right edge.

### Inputs / Fields
- **Style:** 12px radius, 10px/20px padding, 1.125rem text, navy text with 70% navy placeholder. On light grounds: white with a 1px inset ring of 20% navy. On navy: off-white with no ring.
- **Focus:** a 2px outline offset by 2px, med-blue on light grounds and light-blue on navy.
- **Error:** a 2px inset error-red ring and a message below (error red on light, off-white on navy) that fades in. The label is visually hidden but present.

### Navigation
- **Header:** sticky, off-white at 90% with a medium backdrop blur; its bottom hairline appears only once the page scrolls under it. Logo left, medium-weight 1rem links (hover to med-blue) in the middle, secondary Sign in and primary Join the waitlist buttons right.
- **Mobile:** below 72rem a 44px menu button opens a full-screen off-white dialog that unrolls from under the header; links are 1.875rem display text on light-blue row rules with a med-blue chevron, buttons at the bottom. Page scroll locks while it is open.
- **Footer:** white at 60% over the ground, light-blue top rule, logo and one-line description, three link columns headed in small semibold med-blue, a bottom row of small med-blue text.

### Event header
The top of every event page (Attendees, Check in, Analytics, Settings). A back arrow to all events sits level with the event's name (page-title display type), with its dates in med-blue beneath; Edit and the ⋮ menu are at the right. Under them, one bar holds what matters on the night: the status indicator (large) with the self check-in switch for those who can edit the event, a hairline divider, then the attendees' link with Copy link (it reads "Copied" for two seconds and keeps its width) and Share (primary). The bar is white with the `line` hairline, tinted light blue while check-in is open, like a live event's card on Events. Settings shows the status without the switch, since its form has its own. On phones the bar stacks.

### Dashboard sidebar
From 768px the dashboard has a quiet column down the left, 232px wide, on the page's own off-white ground with a `line` hairline on its right, so the page reads first. The logo sits level with the page titles, 32px down. Menu items are a small navy Lucide icon beside a 1rem label; the page you're on gets a light-blue fill and a bold label, and the others take a faint light-blue fill on hover. Small med-blue headings (Screens, Now) start the groups under the menu. The account sits at the bottom behind a hairline: initials circle, name, role and the ⋮ menu.

- **Main pages:** under the menu, **Now** lists the events on now (up to three), each with its status indicator, its name and "41 checked in, of 109", tinted light blue while check-in is open, and each opens that event's Check in page. With nothing on, **Next** shows the next upcoming event and its date. It isn't shown on Events, which leads with the same events.
- **Inside an event:** the event's name alone heads the column where the menu starts on the main pages (card-title display type, up to three lines, with a chevron); the page's header carries its dates and status; the way back to all events is the arrow before the event's name at the top of its pages (and the logo). Pressing the name opens a menu of the events (on now, the next six coming up, the last three) with each one's status or date beneath, the current one ticked in med-blue; choosing one opens the same page of that event. Then the event's pages, then Screens.
- **Phones** have no sidebar: inside an event the top bar's way out is a med-blue "Switch event" menu opposite the logo, with All events first and the same list of events below it.

### Framed Product Shot (signature)
The system's imagery: a real screenshot in a white frame with a light-blue hairline, 16px corners and the screenshot frame shadow. In the hero it sits on a light-blue band that starts halfway down, with the attendee's phone overlapping one edge and a navy arrival toast (med-blue check badge, semibold name, light-blue time) floating over it. Inside tiles, screenshots are cropped and zoomed on the relevant part and fade out where the app continues.

### Check-in Card
The attendee flow centres one white card, 480px max wide, with a 2px med-blue border thickened to 6px along the bottom edge, 12px corners and generous centred spacing. Ticket numbers are set in Geist Mono and print left to right on the confirmation.

### Events List
The Events page is shaped by when each event is. **Now** (open, on today, or left open after it ended) gets one card each, built for a glance on the night: status indicator, time and team, the name, then the live count ("41 checked in, of 109"), the check-in bar and "37 pre-registered · 4 walk-ins", and the phase's buttons. The count sits beside the name from 1280px and between the name and the buttons below that. A live event's card is tinted light blue. **Upcoming** and **Past** are rows in one white list with a `line` hairline round it, scanned by a date column (three-letter month in med-blue, the day in display type, the year only when it isn't this one): the name, weekday and times with the team, then how many registered (upcoming) or "38 of 90 attended · 42%" over a thin check-in bar (past). Every card and row opens the event and carries the ⋮ menu.

The **status indicator** says whether self check-in is open, wherever it appears (Now cards, the Check in heading, Settings, team panels): a dot and a bold, tightly tracked label in navy alone, with no pill. Open is a solid navy dot beside a full-navy label; closed or not yet open is a faint hollow dot beside a lighter label (navy at 60%), so the state reads from the dot's fill as well as the words.

The **check-in bar** is the dashboard's one progress mark: pre-registered arrivals in navy, walk-ins in med-blue, on a light-blue track for everyone still to come, split by 1px gaps. No progress rings.

### Organisers
The Organisers page is a rail beside a panel. The rail (a white box with the `line` hairline, 240px from 1280px, where the panel beside it keeps enough width; a row that scrolls sideways above the panel below that, fading out at both edges) lists Everyone and Invited, a light-blue divider, each team, Super admins, and No team yet while anyone is still to set up their team, each with its count in small med-blue tabular figures (bold navy for a team nobody is in, and navy on the chosen entry), and ends with New team. The chosen entry sits on a light-blue fill in bold; the choice lives in the URL (`?team=<slug>`, `?show=invited`). A team's panel gives its name, place and member count with Manage, then its sign link and the event the link opens (with the status indicator) on an off-white strip with Copy link, then its members. Organisers and team members, who see only their own team, get that team's panel and no rail. People lists follow the shared table pattern, with Role and Team columns once the panel itself is wide enough (a container query), and stacked under the email below that.

### Motion
- **Marketing entrances:** elements marked to enter on load or on scroll fade in and rise 16px over 700ms on a soft ease-out (`cubic-bezier(0.2, 0.8, 0.2, 1)`), staggered 80-100ms in lists. The hero dashboard slides in from the side, the phone rises 120px, then the arrival toast lands; step connectors draw towards the next step.
- **Check-in:** steps slide 24px in the direction of travel over 300ms on a quick ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`); the confirmation lands in sequence (status, name, ticket, note) and the ticket number prints in 14 steps.
- **Dashboard:** motion confirms that something changed, for an organiser who glances at the screen between other jobs. When someone checks in while the attendees table is open, from their phone or at the door, their row washes pale blue (light blue mixed 55% with white, so the initials circle still shows), holds briefly and fades out over 2.4s, and the "Arrived" time fades in where the Check in button was. Rows that load already checked in don't wash. Wherever a live count shows (the Attendees stats card, the Events page's Now cards), the check-in bar's segments slide to the new count over 500ms on the quick ease-out, a segment that wasn't there (the night's first walk-in) grows out from nothing, and the number rolls up into place from below its line over 450ms. The count doesn't roll when the page first draws. On the Events page, "Show all past events" folds the extra rows open to their height over 450ms on a gentle ease-out (`cubic-bezier(0.33, 1, 0.68, 1)`) as they fade in, and "Show fewer" folds them away over 320ms on an ease-in-out, scrolling the Past heading back into view when it's above the screen. ⋮ menus fade and grow from 96% out of their button's corner over 140ms. On the event form, switching "Multi-day event" moves the date and time fields to their new places and sizes over 320ms on the quick ease-out, and the end date fades in where they made room (out, in 120ms, on the way back). Opening New event from the Events page, and cancelling back, is one view transition: the old page fades out in 90ms and the new one fades in after it over 160ms, so the two never overlap, while the sidebar stays put; the primary button travels to become the other page's ("New event" to "Create event") over 280ms, and the form's cards rise 12px into place 50ms apart. "Create event" brightens over 150ms as the form becomes complete; while the event saves it stays solid and its label gives way to a spinner in place, and the new event's page then fades in the same way. On Event settings, "Save changes" and "Discard" brighten and dim the same way as there are changes or not, the "Unsaved changes" pill fades in, and after a save the button stays solid for 1.4s while a tick draws itself beside "Saved" over the label, then dims. Opening an event from the Events page is the same kind of transition: one page gives way to the other and the event's name travels from its row or card to become the page's title over 320ms, and returns to its row when you go back to Events. Moving between an event's own pages (Attendees, Check in, Analytics, Settings, and the Edit button) keeps the event's details in place while the page under them fades out and the next fades in; Settings' cards rise into place like New event's. On the Organisers page, choosing another entry in the rail slides its light-blue fill to that entry over 220ms on the quick ease-out while the panel beside it fades in over 160ms. Moving between the main pages (Events, Organisers, Analytics, Waitlist) is the same: the sidebar or tab bar stays put while one page fades out and the next fades in. A page loaded on first use starts loading when its menu item is pointed at, focused or pressed, so the page fades in rather than a spinner. Dialogs fade and scale in over 180ms, the phone menu slides up as a sheet, and toasts rise 8px over 200ms.
- **Reduced motion:** all movement is dropped; check-in steps, error messages and dashboard toasts keep a short opacity fade because they are new information, and the dashboard's arrival wash stays because it's a colour change, not movement. The check-in bar jumps to its new value and the count only fades in. The event form's fields jump to their new places and the end date only fades in. Opening New event just changes the page.

## Do's and Don'ts

### Do:
- **Do** use only the five pinned colours, white, their derived hover mixes and navy at an opacity.
- **Do** set headings and button labels in Plus Jakarta Sans ExtraBold (800) with tight tracking, and keep body copy regular at line-height 1.5.
- **Do** keep spacing, radius, leading and font size on Tailwind's standard scale; only fixed widths, positions, crops and shadows may be custom values.
- **Do** show the real product: framed, cropped screenshots in light-blue hairline frames with soft navy shadows.
- **Do** build every button from the shared `buttonClass` variants and sizes so web and dashboard render the same button.
- **Do** label any import platform that hasn't shipped as "planned", visibly, every time it appears.
- **Do** write in Australian English (organiser, colour) and end home-page display headings without a full stop.
- **Do** wrap all movement in `prefers-reduced-motion: no-preference`, keeping only opacity fades for new information.
- **Do** use the zoom-aware utilities (`h-viewport`, `min-h-viewport`) on the public site instead of viewport-height units.

### Don't:
- **Don't** add a new hue, a grey, or a black or grey shadow.
- **Don't** put an eyebrow or kicker label above a heading.
- **Don't** use icon tiles or icon-in-a-square feature grids; icons are small inline Lucide strokes inside chips, lists and badges.
- **Don't** give every section the same card treatment; on the home page only the feature grid uses tiles, and the steps, venue needs and extras are quiet ruled lists.
- **Don't** use arbitrary values for spacing, radius, leading or font size.
- **Don't** use the accent (med-blue) button on light grounds; it is the main action on navy only.
- **Don't** use hard offset box-shadows. The check-in card's thicker bottom border is a border treatment specific to that card, not a shadow.
