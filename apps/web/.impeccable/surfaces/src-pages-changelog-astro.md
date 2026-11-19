---
version: 1
slug: "src-pages-changelog-astro"
primary_target: "src/pages/changelog.astro"
related_targets: []
---

# Changelog (checkpad.app/changelog)

Mode: Read. Readers: organisers on Checkpad checking what changed (some arriving from the dashboard's Profile version link) and prospective organisers judging the product's trajectory, equally. Content: the root CHANGELOG.md, one entry per release, each line tagged `[organisers]`, `[attendees]` or both. Constraint: inside the established Checkpad world (DESIGN.md); no new tokens.

## Direction contract

THESIS: A changelog read down one light-blue rail, a node per version, filtered by who a change is for. Refuses the stacked-cards and plain-heading-per-version arrangement.

OWN-WORLD: Off-white ground, navy ink, a 2px light-blue rail with the home page's step-connector feel; the newest version a solid navy node, older ones hollow med-blue rings; version numbers in ExtraBold display, dates and audience labels in small semibold med-blue; the filter is a light-blue segmented control whose white thumb slides.

STORY: The reader sees the latest version and its date first, narrows to their side (organisers or attendees) in one tap, and can link straight to any version.

FIRST VIEWPORT: Header nav; "Changelog" in display type with a one-line intro; the three-way filter (All changes / For organisers / For attendees); below, the rail: version and date right-aligned left of the rail, lines in a reading column to its right. On phones the version and date sit above the lines, the rail at the left edge.

FORM: timeline rail with audience filter, position 2 on the ordered list; seed:774b6bd4802e590c. Signature interaction: the filter's thumb slides between options over 220ms on the quick ease-out and the lines and versions that drop out fade; the choice lives in the URL (`?for=organisers`).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
