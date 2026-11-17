---
version: 1
slug: "src-pages-organiserspage-tsx"
primary_target: "src/pages/OrganisersPage.tsx"
related_targets: []
---

# Organisers page

Scope: the dashboard's Organisers page (`/organisers`). Mode: Operate.

Audience and job: super admins (all teams) invite people and follow up on invites, see who is in each team and change roles, copy a team's permanent link for printed signs and check which event it opens, and set up new teams. Organisers and team members see only their own team. Expected scale within a year: 5–15 teams, 30–100 people.

Constraints: the Add, Edit, Remove organiser, Manage team and Delete team dialogs stay as they are. `?tab=` links need not survive.

## Direction contract

THESIS: The team is the unit. Choosing a team shows its sign link, the event that link opens, and its people in one place, replacing two disconnected tabs (a people table and a stack of team cards).

OWN-WORLD: The dashboard system unchanged: navy ink on off-white, white panels edged with the `line` hairline, light-blue selection and dividers, Jakarta ExtraBold headings, role pills, the dot-and-label status indicator. No new colours.

STORY: A super admin scans the rail (team names with member counts, an empty team's 0 in med-blue), picks a team, copies its link or adds someone to it. Everyone and Invited answer "who is here?" and "has Sam accepted yet?" without knowing their team.

FIRST VIEWPORT: Page title with Add organiser at the right. Below, a white rail about 240px wide (Everyone, Invited, a divider, each team with its count, Super admins, No team yet, then New team) beside a white panel: the team's name, place and member count with Manage; a tinted strip with the team link, the event it opens with its status, and Copy link; then Members with "Add to <team>" and the member rows.

FORM: Team rail and panel, position 2 of 7 on the ranked list, dealt by the roll. seed:30376457c3e83b66. Signature move: the rail's selection fill slides to the chosen entry over 220ms on the quick ease-out while the panel fades to the new team.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
