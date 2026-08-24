# PRD — Portfolio Site: Reference-Replica Rebuild

**Product:** Moin Patel personal portfolio (`heynesh.com` structural replica)
**Status:** Draft for approval
**Supersedes:** All prior "Moin-inspired / NESH-inspired / unique AI developer portfolio" design directions
**Baseline commit:** `4a8e097` (3D core restored)

---

## 1. Summary

Rebuild the existing portfolio so that its visual system, layout, motion, and interaction model are a faithful replica of the reference site `https://heynesh.com/`, with all factual and personal content replaced by Moin Patel's verified data from Supabase.

The equation is:

```
REFERENCE STRUCTURE  +  MOIN'S VERIFIED CONTENT  =  DELIVERABLE
```

It is **not** "reference inspiration + independent design direction."

---

## 2. Objectives

| # | Objective | Measure |
|---|---|---|
| O1 | Visual and interactive parity with the reference | Section-by-section QA sign-off (§13) passes on all 11 sections |
| O2 | Zero fabricated facts | Content audit finds 0 invented stats, testimonials, prices, dates, or links |
| O3 | Content stays database-driven | Adding a public project in admin renders it in the site with no code change |
| O4 | No regression on the existing baseline | All gates in §12.1 pass at their current values |
| O5 | Responsive parity, not naive stacking | All 6 viewports in §10 match the reference's composition logic |

---

## 3. Non-Goals

Explicitly out of scope. Do not build, propose, or "improve toward" any of these:

- An independent Moin visual identity or colour palette
- AI-themed visual language: neon, glow, particles, cyberpunk, terminal aesthetics, dashboards, generic 3D AI graphics
- New navigation concepts, new section layouts, custom SaaS-style cards
- Alternative typography choices or an alternative animation philosophy
- Migration to Next.js
- Re-vendoring fonts or altering the working Geist / Geist Mono implementation
- Invented pricing tiers, testimonials, client logos, statistics, or booking accounts

**Decision rule for every open question:** ask *"How does the reference do this?"* — not *"What would make this portfolio better?"*

---

## 4. Guiding Principles

### P1 — Structural shell, verified content
Every element is classified into one of four substitution modes. The mode determines what changes.

| Mode | Meaning | Applies to |
|---|---|---|
| **A — Direct swap** | Same component, same instance count, content replaced 1:1 | Nav, hero identity, FAQ, contact, footer |
| **B — Reduced instances** | Same visual system, fewer items, no padding with filler | Journey timeline, selected work |
| **C — Repurposed section** | Same visual role and position, different content *type* | Services (no pricing), Testimonials (no social proof) |
| **D — Suppressed element** | Component built and placement preserved, but rendered empty until real data exists | Hero statistics |

Mode D components must remain functional — they render when the data source is populated, without a rebuild.

### P2 — Reference is the source of truth for form
No section may be implemented from memory or from a prior written description. Each requires a fresh audit of the live reference (§6).

### P3 — Supabase is the source of truth for fact
No project, skill, technology, experience entry, or availability state may be hardcoded in a component.

### P4 — Unusual is intentional
If the reference does something visually unconventional, reproduce that behaviour rather than substituting a conventional component.

---

## 5. Users

| User | Goal | Implication |
|---|---|---|
| Hiring manager / recruiter | Assess capability in <60s | Hero, Selected Work, and Contact must be reachable and legible immediately |
| Prospective client | Understand what can be built and how to start a conversation | Services (capabilities) and Contact must be unambiguous |
| Peer / referrer | Share a specific project | Project entries need stable, linkable presentation |

---

## 6. Phase 0 — Reference Audit (blocking)

**No implementation begins until this is complete.** Output is a spec sheet committed to the repo at `docs/reference-spec/`.

### 6.1 Required per section

For each of the 11 sections, capture:

1. **Structure** — DOM hierarchy, wrapper/container pattern, grid or flow model
2. **Metrics** — max container width, section min-height, vertical padding, gutters, column counts
3. **Type** — font family, size, weight, line-height, letter-spacing, transform for every text role
4. **Colour** — background, foreground, border, and any state colours (hex)
5. **Motion** — trigger (scroll position / viewport %), duration (ms), easing curve, property animated, stagger interval
6. **Interaction** — hover, focus, active, and cursor states
7. **Responsive** — how the composition *recomposes* at each breakpoint (not just how it stacks)

### 6.2 Capture template

```yaml
section: hero
container_max_width: 
section_min_height: 
padding: { top: , bottom: , inline: }
type_roles:
  - role: eyebrow
    family: 
    size_desktop: 
    size_mobile: 
    weight: 
    tracking: 
    line_height: 
motion:
  - element: 
    trigger: 
    duration_ms: 
    easing: 
    properties: 
    stagger_ms: 
interaction:
  - element: 
    hover: 
    cursor: 
responsive:
  1440: 
  1024: 
  768: 
  390: 
notes_unusual_behaviour: 
```

### 6.3 Deliverables

- [ ] 11 completed spec YAML files
- [ ] Full-page reference screenshots at all 6 viewports (§10), stored for QA diffing
- [ ] Scroll-capture recording of the reference at 1440×900 and 390×844
- [ ] Motion inventory: every distinct animation with duration + easing
- [ ] Cursor/pointer behaviour spec (§9.6)
- [ ] Dependency decision memo (§11.2)

---

## 7. Information Architecture

### 7.1 Section order

```
1.  NAVIGATION
2.  HERO              — identity, stats (Mode D), CTA, 3D experience
3.  ABOUT / INTRO
4.  MY JOURNEY        — timeline, years, progression
5.  SELECTED WORK     — numbered projects, DB-driven
6.  WHAT YOU GET?     — capability items
7.  SERVICES          — Mode C: capabilities, not pricing
8.  TESTIMONIALS      — Mode C: "BUILT FOR REAL PROBLEMS"
9.  FAQ
10. CONTACT
11. FOOTER
```

Final section names and order are set by the Phase 0 audit, not by this list.

### 7.2 Chapter mapping (constraint)

The existing 3D system defines **exactly seven** `data-chapter` sections consumed by `CHAPTERS` and `buildChapterBands`. Eleven content sections must map onto seven camera bands.

**REQ-IA-1:** Produce and commit a section→chapter mapping table *before* any markup changes. Chapter count stays at 7.
**REQ-IA-2:** Chapter-controlled sections are not reordered casually. Any order change requires an updated band mapping and a re-verified camera path.
**REQ-IA-3:** Sections outside the seven chapters must not break band boundaries — they nest inside an owning chapter or sit outside the tracked scroll range.

---

## 8. Functional Requirements by Section

Every requirement below is conditional on the Phase 0 audit — where this PRD and the audit conflict, **the audit wins**.

### 8.1 Navigation — Mode A

- **REQ-NAV-1** Replicate placement, spacing, typography, sticky behaviour, and scroll-state transitions from the reference.
- **REQ-NAV-2** Replicate mobile menu open/close mechanics, animation, and full-screen or drawer treatment exactly as the reference implements it.
- **REQ-NAV-3** Replace link labels only. No new nav concepts, no added items beyond the reference's slot count unless the section list requires it.

### 8.2 Hero — Mode A + Mode D

- **REQ-HERO-1** Match height, alignment, typographic scale, text position, 3D object position, metadata position, decorative elements, entrance animation, and scroll indicator.
- **REQ-HERO-2** Content:
  - Name: `MOIN PATEL`
  - Role: `AI DEVELOPER & AUTOMATION ENGINEER`
  - Statement: *"I build AI systems, automate real-world workflows, and turn ideas into products."*
  - Location: `SURAT, INDIA`
- **REQ-HERO-3** (Mode D) The statistics component is built to the reference's exact placement and treatment, but reads from Supabase. If no verified stats exist, it renders nothing — it does **not** render placeholder numbers, zeros, or `80+ Projects`.
- **REQ-HERO-4** The stats component must display correctly the moment verified values are added, with no code change.

### 8.3 CTA — Mode A

- **REQ-CTA-1** Match position, size, shape, typography, hover effect, and animation.
- **REQ-CTA-2** Destination is Moin's actual contact route. Do not create or reference a Cal.com or other booking account that does not exist.

### 8.4 About / Introduction — Mode A

- **REQ-ABOUT-1** Match layout, type scale, reveal animation, and spacing.
- **REQ-ABOUT-2** Copy is Moin's own; no adaptation of the reference's wording.

### 8.5 My Journey — Mode B

- **REQ-JRN-1** Match year-marker treatment, typography, connecting line, spacing, scroll behaviour, animation, and layout.
- **REQ-JRN-2** Entries come from verified history only. Do **not** manufacture years to fill the reference's entry count.
- **REQ-JRN-3** With fewer entries, the visual system holds — spacing rhythm and line treatment must still read correctly at reduced item counts. Verify at 3, 4, and 5 entries.

### 8.6 Selected Work — Mode B, DB-driven

- **REQ-WORK-1** Preserve numbered projects, title hierarchy, tag/chip treatment, project imagery, hover behaviour, image transitions, spacing, scroll effects, metadata, and in-section navigation. Do not convert this into a conventional portfolio grid.
- **REQ-WORK-2** Numbering is generated from ordered query results, not authored per project.
- **REQ-WORK-3** Renders every project marked public in Supabase. Currently three:

| # | Project | Reference note (source of truth = DB) |
|---|---|---|
| 01 | Food Metrics | Recipe costing system — React / Vite / Supabase |
| 02 | AI Customer Feedback & Sentiment Engine | — |
| 03 | Bookends Staff Examination Platform | — |

- **REQ-WORK-4** Descriptions, technologies, and metadata render from the database. The table above is for DB-content validation only and must not be hardcoded.
- **REQ-WORK-5** A fourth project added via admin and marked public appears in identical presentation with zero code changes. This is an acceptance test, not an aspiration.
- **REQ-WORK-6** The section must render correctly at 1, 3, and 6+ projects.

### 8.7 What You Get — Mode A

- **REQ-WYG-1** Match capability-item layout, iconography treatment, grid, and reveal animation.
- **REQ-WYG-2** Items are Moin's verified capabilities, sourced from the skills/settings tables.

### 8.8 Services — Mode C

- **REQ-SVC-1** Preserve the reference's Services section structure, card/row treatment, spacing, and motion.
- **REQ-SVC-2** **No pricing.** No `$3,000/mo`, no `$5,000`, no `Custom`, no equivalent. Remove price-bearing elements rather than filling them.
- **REQ-SVC-3** Replace pricing content with verified service areas:
  `AI SYSTEMS` · `AUTOMATION` · `FULL-STACK DEVELOPMENT` · `INTERNAL TOOLS` · `DATA & OPERATIONS`
- **REQ-SVC-4** Where a price slot is removed, the card must not collapse or leave a visual hole — rebalance within the reference's spacing system.

### 8.9 Credibility (Testimonials slot) — Mode C

- **REQ-CRED-1** Section occupies the same position, height, and visual weight as the reference's testimonials section.
- **REQ-CRED-2** Heading: `BUILT FOR REAL PROBLEMS`.
- **REQ-CRED-3** Content is verified project/problem-solving information. **Zero** invented names, companies, quotes, avatars, logos, or ratings.
- **REQ-CRED-4** If the reference uses a carousel/slider, reuse that mechanic for the substituted content rather than replacing it with a static block.

### 8.10 FAQ — Mode A

- **REQ-FAQ-1** Match accordion design, typography, spacing, open/close animation, numbering (if present), and responsive behaviour.
- **REQ-FAQ-2** Questions:
  - *What do you build?* → AI-powered applications, automation systems, internal tools, and full-stack products.
  - *Do you work with existing systems?* → Yes.
  - *Do you build complete products?* → Yes.
  - *Are you available for projects?* → **Dynamic.** Read from `available_for_work` and the existing settings label.
- **REQ-FAQ-3** Availability is never hardcoded. Toggling `available_for_work` in admin must change the rendered answer.

### 8.11 Contact — Mode A

- **REQ-CON-1** Match layout, typography, CTA, contact card, background, animation, spacing, and its relationship to the footer.
- **REQ-CON-2** Use verified email, GitHub, LinkedIn, and other real links only. No invented profiles or handles.

### 8.12 Footer — Mode A

- **REQ-FOOT-1** Match the reference footer visually. No redesign.
- **REQ-FOOT-2** Replace name, copyright, links, and contact info only.

---

## 9. Motion & Interaction Requirements

Motion is part of the replica, not a finishing touch.

- **REQ-MOT-1** Match duration, easing, reveal style, scroll interaction, movement, scale, opacity, transitions, and hover behaviour per the Phase 0 motion inventory.
- **REQ-MOT-2** A blanket `fade-in` applied to every section is a defect, not an implementation.
- **REQ-MOT-3** Text reveals, image reveals, and page transitions each use their own specified treatment.
- **REQ-MOT-4** Page transitions must preserve continuity — no white flash, no layout jump between routes.
- **REQ-MOT-5** Scroll behaviour (smoothing, momentum, scroll-linked progress) matches the reference.
- **REQ-MOT-6 — Cursor:** If the reference uses a custom pointer, replicate size, movement/lag, hover state, interactive state, and project-hover state. Do not invent a different cursor concept. Disable or simplify on touch devices.
- **REQ-MOT-7** All motion respects `prefers-reduced-motion` with a degraded — not broken — experience. Flag to stakeholders if the reference does not do this; accessibility floor holds regardless.

**Tolerance:** durations within ±50 ms of measured reference values; easing curves matched exactly where extractable.

---

## 10. Responsive Requirements

**REQ-RES-1** Test and sign off at:

| Viewport | Class |
|---|---|
| 1440 × 900 | Desktop L |
| 1280 × 800 | Desktop M |
| 1024 × 768 | Tablet landscape |
| 768 × 1024 | Tablet portrait |
| 390 × 844 | Mobile L |
| 375 × 812 | Mobile M |

**REQ-RES-2** Follow the reference's responsive *composition*. Vertically stacking the desktop layout is not an acceptable mobile implementation.
**REQ-RES-3** Mobile navigation matches the reference's mobile nav mechanics.
**REQ-RES-4** 3D/canvas behaviour on mobile follows the reference's approach (whatever it does — reduce, simplify, or retain).
**REQ-RES-5** No horizontal overflow at any tested width.

---

## 11. Technical Constraints

### 11.1 Stack — locked

Vite 7 · React · React Router v7 · TypeScript · Tailwind · Supabase

- **REQ-TECH-1** No migration to Next.js.
- **REQ-TECH-2** The 3D system from `4a8e097` remains. `src/components/three/`, `coreFraming.ts`, `motion.ts`, and `chapters.ts` are existing infrastructure — do not delete, do not swap for a different 3D implementation unless replica parity is otherwise impossible (requires written justification).
- **REQ-TECH-3** Fonts: Geist and Geist Mono are working. Do not reapply prior font vendoring; do not remove the current implementation. `document.fonts.check()` must continue to succeed for both families — assert this in the UI verification suite.
- **REQ-TECH-4** Supabase remains the source of truth for projects, technologies, skills, experience, settings, availability, and public content. No DB content hardcoded into components.

### 11.2 Dependency gate

- **REQ-TECH-5** Do not add animation frameworks if existing infrastructure can reproduce the reference. If the audit shows a specific behaviour (e.g. scroll smoothing or timeline sequencing) is not reproducible with current tooling, produce a one-page memo — behaviour, why current infra fails, proposed dependency, bundle cost — and get approval before installing.

---

## 12. Quality Gates & Acceptance

### 12.1 Regression gates — must not degrade

| Gate | Required |
|---|---|
| Test suite | 229 passing |
| DB tests | 87/87 |
| Admin tests | 73/73 |
| `verify:ui` | 138 / 0 failures |
| Lint | Clean |
| Typecheck | Clean |
| Build | Clean |

Run the complete verification suite after replica work. Any regression blocks release.

### 12.2 Content-integrity acceptance

- [ ] 0 invented statistics
- [ ] 0 invented testimonials, names, companies, quotes, or avatars
- [ ] 0 invented prices
- [ ] 0 invented journey years
- [ ] 0 invented social/booking links
- [ ] Availability renders from `available_for_work`, verified by toggling it
- [ ] Adding a public project via admin renders it with no code change

### 12.3 Visual QA — per section, all 11

Compare against the reference and record pass/fail:

| Axis | Question |
|---|---|
| Structure | Does the layout match the reference's composition? |
| Scale | Are headings within ~10% of the reference's visual scale at 1440px? |
| Spacing | Does the whitespace rhythm read the same? |
| Motion | Does scrolling behave the same way? |
| Interaction | Do hover, focus, and click states behave the same? |
| Transitions | Does the page feel continuous? |
| Mobile | Does the responsive experience follow the same design logic? |

Any fail is fixed before sign-off — not annotated as an intentional difference.

### 12.4 Non-functional floor

| Area | Requirement |
|---|---|
| Performance | LCP < 2.5s and CLS < 0.1 on 4G/mid-tier mobile; 3D must not block first paint |
| Accessibility | Keyboard-navigable nav, FAQ, and CTAs; visible focus states; AA contrast on body text; `prefers-reduced-motion` honoured |
| SEO | Correct title, description, OG tags, canonical, and a single H1 per page |
| Browser | Latest 2 versions of Chrome, Safari, Firefox, Edge; iOS Safari and Chrome Android |

---

## 13. Risks & Mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Design-similarity / IP exposure.** Layout patterns and spacing systems are generally not protectable, but source code, CSS, custom imagery, 3D assets, icon sets, and copywriting are. | Legal exposure; takedown | Rebuild from measured specs only. Do not copy source, stylesheets, or assets from the reference. Do not reuse its copy. Confirm any licensed assets are independently sourced. |
| R2 | **Credibility risk.** A portfolio's purpose is to demonstrate original capability; a recognisable clone of another developer's site can undercut that with the exact audience it targets. | Reduced conversion | Decide consciously at sign-off. If this matters, the mitigation is divergence in the visual identity layer (colour, type, decorative treatment) while retaining the structural and motion quality — a scope change requiring approval. |
| R3 | Reference is Webflow-based and may rely on GSAP/Lenis or similar | Parity gap or unapproved dependency | Resolve through the §11.2 dependency gate during Phase 0 |
| R4 | 11 sections → 7 chapter bands | Broken camera path | REQ-IA-1 mapping table committed before markup changes |
| R5 | Mode B/C/D substitutions leave visual holes | Section reads as unfinished | REQ-SVC-4, REQ-JRN-3, REQ-HERO-3 — explicit empty/reduced-state design for each |
| R6 | Motion parity conflicts with performance and reduced-motion | Failing §12.4 | Accessibility and performance floors are non-negotiable; degrade motion, never break layout |
| R7 | Audit measurements drift from the live reference mid-build | Rework | Freeze the Phase 0 spec sheet and screenshots as the build target; do not re-audit mid-implementation |

---

## 14. Delivery Plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — Audit** | §6 in full; dependency memo; chapter mapping table | Spec sheet + screenshots committed; mapping approved |
| **1 — Foundation** | Tokens, type scale, spacing scale, container widths, motion primitives, cursor | Tokens match spec; existing gates still green |
| **2 — Structure** | Nav, Hero, About, Footer | Sections pass §12.3 at 1440 and 390 |
| **3 — Content sections** | Journey, Selected Work, What You Get, Services, Credibility, FAQ, Contact | All Mode B/C/D rules verified; §12.2 passes |
| **4 — Motion & 3D** | Scroll behaviour, reveals, transitions, chapter bands, cursor | Motion inventory reproduced within tolerance; camera path verified |
| **5 — Responsive** | All 6 viewports | §10 passes; no horizontal overflow |
| **6 — QA & release** | Full §12 sweep | All gates green; visual QA signed off section by section |

---

## 15. Definition of Done

Opening the finished site, a viewer should immediately recognise the reference website experience — with Moin Patel's name, projects, journey, capabilities, verified credibility, and contact details in place of the original's.

Ship only when all of the following are true:

- [ ] All 11 sections pass §12.3 visual QA on all 7 axes
- [ ] All 6 viewports pass §10
- [ ] All §12.1 regression gates green at their baseline values
- [ ] All §12.2 content-integrity checks pass
- [ ] §12.4 non-functional floor met
- [ ] 3D core from `4a8e097` intact; 7 chapters intact; camera bands verified
- [ ] `document.fonts.check()` passes for Geist and Geist Mono
- [ ] No Moin-specific redesign, no AI-themed reinterpretation, no new visual language, no invented facts

---

## 16. Open Questions

| # | Question | Owner | Blocks |
|---|---|---|---|
| Q1 | Which 7 of the 11 sections own chapter bands? | Eng | Phase 1 |
| Q2 | Does the reference honour `prefers-reduced-motion`? If not, confirm we diverge. | Eng / Approver | Phase 4 |
| Q3 | Are there any verified statistics for the hero, or does it ship empty (Mode D)? | Content | Phase 2 |
| Q4 | How many verified journey milestones exist, and what are their years? | Content | Phase 3 |
| Q5 | Does the reference have routes beyond the homepage (project detail, about)? Are they in scope? | Approver | Phase 0 |
| Q6 | Confirm the contact destination — direct email, form, or existing contact route? | Approver | Phase 2 |
| Q7 | Accept R2 as-is, or scope a divergent identity layer? | Approver | Phase 1 |
