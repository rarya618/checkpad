---
version: 1
slug: "src-pages-signinpages-tsx"
primary_target: "src/pages/SignInPages.tsx"
related_targets: ["src/pages/OnboardingPage.tsx","src/pages/ErrorPage.tsx"]
---

# Sign-in screens (manage.checkpad.app/sign-in, /sign-in/check-email, /sign-in/link, /no-access)

Mode: Operate. Visitors: organisers and team members who already have access, getting into the dashboard, often on a phone at the venue; a few attendees or curious visitors who land here by mistake. Door only: get the right people in quickly and send everyone else on with one clear line. The user found the old card generic and its copy unclear ("your organiser added", two equal ways in, footnotes). Constraint: inside the established Checkpad world (DESIGN.md); no new tokens. The shared layout also frames Onboarding and the error page.

## Direction contract

THESIS: Each screen asks or answers one thing, in display type on the page's own ground. Refuses the logo-over-a-centred-card login.

OWN-WORLD: Off-white ground, navy ink, no card. Logo top-left where the site header puts it; the question or answer in ExtraBold display; one large white field with a 20% navy inset ring and the navy button beside it; Google as a quiet med-blue text link with its mark; two light-blue wrong-door panels at the foot, each one link: attendees to Help checking in, newcomers to the waitlist.

STORY: An organiser reads "What's your email?", types it, and is told plainly what happens next; anyone who isn't an organiser sees at the foot where to go instead.

FIRST VIEWPORT: Logo top-left; the question left-aligned in the middle of the screen, up to 720px wide, a line of plain explanation, then field and button on one row (stacked on phones), "or continue with Google" under it; the two wrong-door panels at the bottom.

FORM: one question per screen, position 4 on the ordered list; seed:730e80865e30cd67. Signature interaction: moving from one screen to the next, the question rises into place as the old one gives way, so the flow reads as one conversation; the button keeps its size and shows a spinner while it sends.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
