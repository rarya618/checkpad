---
version: 1
slug: "emails-sign-in-html"
primary_target: "emails/sign-in.html"
related_targets: ["emails/invite.html"]
---

# Checkpad's emails (functions/emails/: sign-in, invite)

Mode: Operate. Readers: organisers opening a sign-in code (often on a phone, while signing in on another device) or an invite from a teammate. Goals the user set: match the new sign-in screens, be quick to act on (the code or next step visible in the preview), look trustworthy (clearly from Checkpad, why it came, where links go), read well in dark mode. Clients: Gmail, Apple Mail, iOS Mail and Outlook on the web and phones; not desktop Outlook for Windows. Constraint: Checkpad's pinned palette; email clients don't load web fonts, so a system font stack stands in for Plus Jakarta Sans.

## Direction contract

THESIS: A letterhead before the letter: who it's from, which address and why come first, then the one thing to act on. Refuses the logo-over-a-centred-card transactional email.

OWN-WORLD: White page, a 4px navy rule across the top, the logo and a med-blue sender line ("Sign-in request for priya@example.com · 6:24pm AEDT") over a light-blue hairline. Navy ExtraBold-feel headline, the code in bold spaced figures on a light-blue panel with 12px corners, the navy button full width, and a hairline-ruled footer that says how to tell a real Checkpad email. Dark mode: navy ground, off-white text, the light logo, a light-blue button.

STORY: The organiser sees in the preview what this is and the code itself; opening it confirms who and why, then they type the code or tap the link.

FIRST VIEWPORT: Rule, letterhead (logo, sender line), headline, one line on where and how long, the code panel, then "Or, on the device you asked from…" and the button; on a phone, all of it above the fold.

FORM: letterhead, position 2 on the ordered list; seed:a7c4507cff29c4b5. Signature: the letterhead line carries the address and time, so the email answers "did I ask for this?" before anything else; a hidden preheader puts the code in the inbox preview.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
