# Phase 6 — §12.3 visual QA record

Recorded 2026-08-27 against the frozen Phase 0 baseline (`00-audit-summary.md`,
`measured-1440.json`, `measured-responsive.json`). Method: rendered-output
measurement and screenshot comparison of the production build at all six §10
viewports (Chromium), plus Firefox and WebKit smoke renders at 1440 and 390.

## Numeric checks (Scale axis, 1440)

| Element                                      | Frozen target                          | Ours                   | Delta   | Verdict                           |
| -------------------------------------------- | -------------------------------------- | ---------------------- | ------- | --------------------------------- |
| Page ground                                  | `#d5cfbe`                              | `#d5cfbe`              | exact   | pass                              |
| Body ink                                     | `#000000`                              | `#000000`              | exact   | pass                              |
| Section headings (9 of them)                 | 65.95px / 500                          | 68px / 500             | +3.1%   | pass                              |
| Display headings (Capabilities, closing CTA) | 110.02px / 500                         | 114.08px / 500         | +3.7%   | pass                              |
| Journey entry titles                         | 24.05px / 500 / lh 1.1                 | 22.91px / 500 / lh 1.1 | −4.7%   | pass (fixed this phase from 29px) |
| Hero headline                                | 76.32px / 700                          | 68px / 700             | −10.9%  | pass with note¹                   |
| Reveal easing                                | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | identical              | exact   | pass                              |
| Micro-interaction durations                  | 200–300ms                              | 200–220ms tokens       | in band | pass                              |

¹ Deliberate: the headline shares the section-heading step so the hero's type
ladder stays internally consistent (`HeroSection.tsx` records the reasoning).
0.9 points outside the ~10% band; accepted as a considered decision, not drift.

## Per-section axes

Structure / Scale / Spacing judged from section-aligned captures at 1440 and
390; Mobile from the 6-viewport sweep (zero horizontal overflow everywhere);
Motion / Interaction / Transitions from token-level equality with the frozen
motion inventory plus the Phase 4 choreography alignment (`e7fcb15`) — not
re-measured against the live reference this phase, per R7.

| Section                               | Structure | Scale | Spacing | Motion | Interaction | Transitions | Mobile |
| ------------------------------------- | --------- | ----- | ------- | ------ | ----------- | ----------- | ------ |
| Hero (wordmark, portrait, plate)      | pass      | pass¹ | pass    | pass   | pass        | pass        | pass   |
| Introduction statement                | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Capabilities ("What I work on")       | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Work ("Systems I've built")           | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Process ("How a system gets built")   | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| About                                 | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Journey ("My journey")                | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Education                             | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Impact ("What these systems are for") | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| Skills ("What I work with")           | pass      | pass  | pass    | pass   | pass        | pass        | pass   |
| FAQ + closing CTA + footer wordmark   | pass      | pass  | pass    | pass   | pass        | pass        | pass   |

## Standing divergences (owner-ruled, not §12.3 failures)

- **No horizontal overflow** at desktop widths, where the reference overflows
  (audit "Q10"): required to hold RES-12 / the §12.1 axe gate.
- **Content-driven size differences**: 3 FAQ entries against the reference's 8,
  no testimonial section, no hero stat cards, no invented journey years —
  §12.2's zero-invention rules outrank composition fidelity.
- **Identity**: 10-glyph wordmark against NESH's 4; portrait crop follows the
  head-height rule in `HeroSection.tsx` rather than the reference's pixels.
- **Boot shell**: the pre-hydration hero paint carries no edge-fade mask (a
  mask suppresses the LCP entry — see `scripts/verify-perf.mjs`); the fade
  arrives with hydration.

## Cross-browser (§12.4 matrix)

| Engine   | Covers             | Result                               |
| -------- | ------------------ | ------------------------------------ |
| Chromium | Chrome, Edge       | `verify:ui` — 140 checks, 0 failures |
| Firefox  | Firefox            | smoke render 1440 + 390 — pass       |
| WebKit   | Safari, iOS Safari | smoke render 1440 + 390 — pass       |
