# Portfolio transformation — current → target

> The site works and is verified. What it is not is distinctive. This document maps the existing
> implementation onto a new information architecture built around one idea: **"I build intelligent
> systems."**
>
> It exists so that no section is deleted before it is mapped, and so the reasoning survives the
> conversation it was decided in.

**Reference:** heynesh.com, for *principles only* — interaction quality, storytelling, typographic
confidence, whitespace. Nothing is copied: not layout, wording, structure, type, colour, animation,
components or assets. The result has to be unmistakably this person's.

---

## What is protected

Phases 3 and 4 produced infrastructure that took a great deal of measurement to get right. It is
not re-opened by this work.

| Protected | Why |
|---|---|
| `ScrollDirector` as **single writer** to the scene | Two writers means the last one each frame wins; that bug shows up as jitter only while scrolling |
| Core at the world origin, moved by camera only | Every rotation in the spec is centred on the object |
| Portrait-anchored hero framing (`useHeroFraming`) | Owner-approved Phase 3 composition |
| Section-derived chapter timeline (`chapterTimeline`) | Fixed percentages drifted from the sections they were named after and produced real WCAG failures |
| Text-aware framing + glow avoidance (`coreFraming`) | The only mechanism that keeps text legible without dimming the Core |
| Chapter 03 bottom bleed | Deliberate; the Core cannot be both contained and clear of that heading |
| `CHAPTER_MOTION` continuity chain | Each chapter starts where the last ended; a break teleports the camera |
| GSAP is **DOM-only** | Its ticker runs between frames and would write to three.js objects mid-render |
| Reduced motion: GSAP chunk never fetched | The guard is at the call site, so no inline style is ever applied |
| Contrast harness integrity | No threshold changes, no removed positions, no weakening |
| Modern-colour alpha parsing in `useTextGeometry` | `oklab(… / 0.3)` was read as opaque; that bug hid exposed text from the framing search |

---

## Section mapping

Nothing is invented where something already exists.

| # | New section | Source | Chapter | Notes |
|---|---|---|---|---|
| 01 | **HERO** | `HeroSection` | ch01 | Redesigned. All nine FR-HOME-02 elements and the portrait anchor stay |
| 02 | **WHAT I BUILD** | `IntroductionSection` + `CapabilitiesSection` | ch02 | The statement carries ch02's closest approach; four areas revealed beneath it |
| 03 | **SELECTED SYSTEMS** | `FeaturedProjectsSection` | ch03 | Renamed and rebuilt as case-study cards |
| 04 | **HOW I THINK** | `ProcessSection` | ch04 | Re-framed to UNDERSTAND / MAP / AUTOMATE / BUILD / MEASURE / IMPROVE |
| 05 | **JOURNEY** | `ExperienceSection` + `AboutSection` + `EducationSection` | ch05 | Merged into one evolution narrative |
| 06 | **AI LAB** | *new* | hold | Verified capability areas only — see Content honesty |
| 07 | **CAPABILITIES** | `SkillsSection` | ch06 | Regrouped by purpose, not a skill cloud |
| 08 | **PROOF / IMPACT** | `ImpactSection` | hold | Qualitative outcomes retained — see Content honesty |
| 09 | **CONTACT** | `ContactCtaSection` | ch07 | "Have a problem worth automating?" |

`WhatIBuildSection.tsx` is currently **dead code** — superseded by `CapabilitiesSection` in Phase 1
but never removed. Its process-line motif is absorbed into section 02, then the file goes.

`EducationSection` has no route of its own. Folding it into Journey is a move, not a deletion; if it
were simply dropped it would leave the site entirely (motion-spec §12).

---

## Chapter model — 7 chapters, 9 sections

The narrative keeps **seven** chapters. `CHAPTER_MOTION`'s seven entries and their values stay
byte-identical; only the `ChapterId` labels are renamed to the new narrative.

AI Lab and Proof sit in the **hold region** the timeline already has for non-narrative content,
where the scene holds the previous chapter's calm end state. That mechanism exists and is tested —
it is what Impact / Experience / Skills / Education already use.

Chapter *N*'s choreography lands on IA position *N*, and the fit is genuinely good:

| Chapter motion | Lands on | Why it works |
|---|---|---|
| ch02 — closest approach, statement lines replace one another | WHAT I BUILD | It *is* the statement |
| ch03 — the Core opens, four components become visible | SELECTED SYSTEMS | The system opens to show what is inside it |
| ch04 — lateral travel, one station per item | HOW I THINK | Six process stages as six stations |
| ch05 — widest, seen as a whole | JOURNEY | Evolution read from above |
| ch06 — quietest on the page | CAPABILITIES | A calm list, deliberately unshowy |
| ch07 — collapse to a point | CONTACT | The closing gesture |

**One targeted change:** `projectsCamera`'s lateral-station special case in `motion.ts` is keyed by
chapter id. It moves to whichever chapter carries Selected Systems so the work keeps its per-item
camera travel. The continuity chain is untouched.

Tests referencing chapter names change **because the IA changed** — a requirement change, not an
edit to make the suite green. Each is explained where it happens.

---

## Content honesty

The brief proposes content the repository cannot support. The rule is unchanged: verified material
or a marked placeholder, never an invention.

| Asked for | Status | Decision |
|---|---|---|
| Proof metrics: 50+ sheets, 4,152 recipe records, 6 locations, 100+ reviews/week | **Found nowhere** in code, SQL or docs | Qualitative outcomes retained. FR-HOME-05a is P0: no numeric metric unless DB-stored and owner-approved |
| AI Lab: RAG, agents, vision, voice | Previously ruled unsupported — "there is no agent or retrieval system" | Built from the four verified areas; anything further needs confirmation of genuine exploration |
| Chucky, portfolio-system as case studies | Not in the database | Cannot appear until published; three projects are live today |

Placeholders are structured and reported, never filled with plausible-sounding copy.

---

## Design system

Extend `tokens.css`; no magic numbers in components. New: display type scale, metadata scale,
section rhythm, container widths, motion durations and easings, surface levels, Core interaction
states.

**Typography.** Q-25 is finally closed: Geist variable is self-hosted (latin subset) rather than
named-and-absent. It costs **nothing** against the performance budgets — the guard measures `.js`
chunks, so a woff2 is invisible to it. It is still real network weight, so it gets `preload`,
`font-display: swap`, and a layout-shift check.

---

## Phases

| Phase | Work | Ends when |
|---|---|---|
| **0** | Close Phase 4 — validate `HOLD_SCALE_FACTOR` | ✅ done: all Core contrast failures cleared |
| **A** | This document | ✅ done |
| **B** | Design tokens + self-hosted Geist | Tokens in place, no magic numbers |
| **C** | Homepage IA, layout, typography, content — **no scene changes** | Page reads premium before any new motion |
| **D** | Scroll choreography via existing `ScrollChoreography` | One timeline system, not two |
| **E** | Core narrative states, all through `ScrollDirector` | One dimension at a time, each with a reason |
| **F** | Responsive across the eight widths | No overflow, framing intentional |
| **G** | Accessibility and contrast | Every failure attributed before it is fixed |

Each phase ends green and reviewable.

---

## Baseline at the start of this work

| Suite | Result |
|---|---|
| lint · typecheck · build | clean |
| unit tests | 229 passed, 14 files |
| `db:verify` | 87 / 87 |
| `verify:admin` | 73 / 73 |
| `verify:ui` | 132 passed, **4 failed** — all pre-existing palette, zero Core-related |

Budgets: Home **489.22 / 650**, shell **186.45 / 190**, every route inside 180 KB.

The four remaining failures are `text-muted` and the success green on raised surfaces, measured
identical with the canvas removed. They are a palette question, out of scope here, and must not be
confused with anything this transformation introduces.
