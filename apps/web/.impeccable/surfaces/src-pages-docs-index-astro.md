---
version: 1
slug: "src-pages-docs-index-astro"
primary_target: "src/pages/docs/index.astro"
related_targets: ["src/pages/docs/[slug].astro","src/lib/docs.ts"]
---

# Docs (checkpad.app/docs and /docs/<topic>)

Mode: Read. Readers: organisers, equally reading through before a first event and looking something up mid-task, often on a phone at the venue. Content: the organiser guide, one page per topic, written in the dashboard's own wording. Constraints: inside the established Checkpad world (DESIGN.md); code leads the Figma "Docs – desktop/mobile" frames, which get updated afterwards; screenshots come from the Figma file's "Website screenshots" section.

## Direction contract

THESIS: A docs frame with every topic always in reach: a quiet sidebar grouped by when you need it (Set up, On the night, Afterwards, Help) beside one topic per page. Refuses the one long numbered page and a card-grid docs index.

OWN-WORLD: Off-white ground, navy ink; the sidebar is the dashboard's quiet column carried to the site: small med-blue group headings, 1rem medium links, the current page on a light-blue fill in bold, a line hairline separating it from the reading column. Topic titles in Headline display type; body at a 72ch measure; framed screenshots with the screenshot shadow; numbered steps keep navy ordinal circles; tips on light-blue.

STORY: A first-timer reads Set up top to bottom using Next at the foot of each page; someone mid-event jumps straight to On the night or When something goes wrong from the sidebar or the index.

FIRST VIEWPORT: Header nav; below, the sidebar at left (260px) with the four groups and the current page filled; the reading column with the topic title, its first paragraph and its screenshot. On phones the sidebar folds into an "All docs pages" disclosure above the title. The /docs index uses the same frame: title, one-line intro, then each group with its topics and a one-line description.

FORM: sidebar by stage, position 1 on the ordered list; seed:9ae4c02cd97c2646. Signature interaction: previous and next at the foot of every page carry you through the guide in order; old /docs#section links land on their new page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
