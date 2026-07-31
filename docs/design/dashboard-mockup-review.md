# Dashboard mockup review (2026-07-31)

Owner-supplied mockups for the runner app, customer dashboard, and admin
ops map, reviewed against locked decisions and `FRONTEND_GUIDELINES.md`.
Priority per owner: **mobile first** — it is expected to be the dominant
viewport — with UI/UX that stays premium and easy for senior customers.

Mockups are reference material (`AGENTS.md` authority order), not authority.
Where a mockup conflicts with a locked decision, the locked decision wins and
the conflict is listed below rather than silently implemented.

---

## 1. Runner mobile (route view / proof capture / offline state)

### Adopt

- **Offline-first framing is right and mostly already built.** "No signal ·
  keep going", "4 stops queued to upload", per-stop `photo queued` / `synced`
  rows, and "Saved to device · uploads when online" are the correct mental
  model for rural Prescott dead zones, and they match the offline queue in
  `TECH_STACK.md`. The per-stop sync-state list is better than the current UI
  and worth building — it turns "did my work save?" into a visible answer.
- **Proof-before-advance.** "…required before stop 5 unlocks" matches the
  server-enforced proof-before-complete rule already implemented in P4-04.
  Good — keep the *server* as the enforcement point; the lock icon is UI
  affordance only.
- **Big single-purpose controls.** Full-width `Navigate`, `Mark done`,
  `Retake photo` at 18–22px labels match the runner typography rule.
- **Location confirmation** ("Within 40 ft of property") is compatible with
  `PROJECT_TRUTH.md` — location captured *at task submission*, not continuous
  tracking. Keep it **advisory** (a confidence signal on the completion
  record), not a hard gate: a runner standing in a driveway with bad GPS must
  still be able to complete a stop, or the offline story breaks.

### Conflicts — do not build as drawn

- **`gate code 4417` printed on the route list card.** To be clear about
  scope: the mockup itself is placeholder content and leaks nothing, and
  marketing material uses dummy data (owner, 2026-07-31). The concern is the
  *runtime pattern* it implies, not the image. Access secrets are encrypted
  at rest and revealed only through an audited, task-scoped server call
  (`revealAccess()` → `POST /api/runner/tasks/[id]/access`, P1-05). If the
  shipped route list renders access details inline, that surface prints real
  gate codes for every stop at once on a scrollable list — screenshottable,
  shoulder-surfable, and outside the per-task audit trail. Keep the existing
  explicit "Reveal access details" action per stop. This is D-009 /
  `.claude/rules/security.md`. Everything else about the card layout is good
  and can be built as drawn.
- **The `樓` glyph** in the location-confirmed row is a broken icon fallback.
  Beyond the rendering bug, production UI is emoji-free unless explicitly
  approved (`AGENTS.md`). Use a text label or an SVG icon.

---

## 2. Customer dashboard (desktop 1280 + mobile 375, active and waitlisted)

### Adopt

- **Bottom tab bar on mobile.** The single highest-value change in this set
  for the stated senior-customer goal. The portal currently renders six text
  links in a horizontally-scrolling header row — sideways scrolling to reach
  "Support", and link-sized hit areas that miss the 44×44px rule the project
  already commits to. A 3-slot bottom bar is thumb-reachable, always visible,
  and self-explanatory. Implemented (PP-16).
- **"Next service" leads.** Status-first, one obvious answer to "when is my
  next pickup?" — correct hierarchy for this audience.
- **Plain-language day + time** ("Thursday / Cans out by 6:00 am") reads far
  better than a formatted date range. Note the *copy* must stay within the
  service-window rule: rollout is the evening before within a planning
  window, and CurbSitter never promises an exact arrival time
  (`PROJECT_TRUTH.md`). "Cans out by 6:00 am" describes the customer-visible
  outcome, which is acceptable; "we arrive at 6:00 am" would not be.
- **Same shell, different payload** for active vs. waitlisted. Good
  structural call — one layout, one nav, different cards.
- **Yes-paths on the waitlist screen** ("Can't wait? → One-time pickup").
  Matches the existing `CurbSitter onDemand` product and the review's
  no-dead-end principle.
- **`$60 credit` for 3 referrals** is consistent with the reverted
  Give $20/Get $20 (D-014) — 3 × $20. Under the short-lived $10/$10 it would
  have read $30. Nothing to change; noting it because it confirms the two
  changes agree.

### Conflicts — do not build as drawn

- **Pricing throughout is wrong.** The mockups show `$40/mo`, `2 cans`, and
  `One-time pickup · $18`. Locked pricing (D-004) is Home **$65/mo** (up to
  **3 bins**), Complete **$85/mo** (up to 6 bins), onDemand **$25**. These
  are the research document's CanMonkey-derived numbers leaking into the
  design. All figures must render from `src/config/business.ts` (D-017), not
  literals.
- **"Street captain · top 10%".** A public ranking of customers against each
  other. Unless genuinely computed it is fabricated social proof (D-015), and
  even when real it reproduces the Google Fiber "redlining" failure the
  research document itself warns about. The user's **own** exact referral
  count ("You've brought in 3 neighbors") is honest and worth keeping — drop
  the comparative tier.
- **"6 neighbors joined this week."** A real velocity figure is not
  *fabricated*, so this is not automatically a D-015 violation — but it
  publishes neighborhood density, which is the one number that tells a
  competitor exactly where CurbSitter is weak. Recommend replacing with the
  qualitative state already implemented in `route-cell-labels.ts`
  ("Opening soon"). Owner call, not an agent call.

### Permitted, with a correction to an earlier over-restriction

The waitlist **progress bar itself is allowed**. `PROJECT_TRUTH.md` states:
"The marketing UI may show progress toward activation, but the threshold must
be configurable and administrator-approved." So a bar showing real progress
toward a real, admin-set activation threshold is compliant and can be built.

What remains prohibited is the research document's *fuzzing* layer — a
denominator deliberately falsified ±15%, and an "adaptive threshold [that]
quietly moves so the bar never sits at a demoralizing dead stop". A bar
whose goal silently moves is fabricated progress regardless of intent.

Net: build the bar against `route_cells.capacity` / an admin-set activation
threshold, show it honestly, and let it sit still if it is not moving.

---

## 3. Admin ops map (desktop 1280 / tablet 768 / mobile 375)

Everything here is a staff-only surface, so density figures, per-cell counts,
and route economics are fine — `PROJECT_TRUTH.md` bars *public* fabricated
metrics, and `/admin/reports` already labels these as internal decision
inputs.

### Adopt

- **Progressive collapse across breakpoints** — three-pane at 1280, map +
  metrics drawer at 768, map-as-page + drag-up sheet at 375 — is exactly the
  responsive strategy tracked as PP-12, now concretely specified.
- **"Layers · 2 on"** as a single collapsed control on small screens, rather
  than five simultaneous toggles. Matches the current layer model
  (`showCells` / `showProperties`) and extends cleanly.
- **Density-by-route chart with a dashed breakeven line.** The strongest
  idea in the admin mockup: it renders the route-density rule as a visual
  pass/fail against the ~6–8 homes/hour breakeven, turning
  `PROJECT_TRUTH.md`'s route-density rule into something glanceable. Feeds
  PP-13.
- **Channel ROI rows** (door hangers / referral / PPC, each with a CAC).
  Blocked on PP-10 — there is no channel/campaign column on
  `eligibility_checks` or `waitlist_leads` yet, so there is nothing to
  group by. Build PP-10 first or this panel renders fabricated numbers.
- **Service-day filter chips** (Thu/Mon/Tue/Wed/Fri). Natural fit once PP-09
  lands the hauler × collection-day matrix.

### Note

- `11.2/hr` per-cell density and `41 signals` imply per-cell throughput and
  waitlist-demand aggregates that aren't computed yet. They are legitimate
  internal metrics — just unbuilt. Sequenced under PP-13.

---

## Sequencing

Implemented now: **PP-16** (customer mobile bottom tab bar) — self-contained,
mobile-first, fixes an existing touch-target rule violation, and needs no
schema change.

Unblocked and specified, not yet built: PP-12 (admin mobile sheet), PP-14
(reschedule/skip), runner per-stop sync list.

Still gated behind plan mode + owner review: PP-09, PP-10, PP-11 (schema
and/or real eligibility-affecting geodata).

Competitor references (CanMonkey, Shoreline Waste, ValetHero) may inform
interaction patterns and information hierarchy. They must not be a source of
pricing, service scope, claims, or copy — those come from
`PROJECT_TRUTH.md` and `src/config/business.ts` only.
