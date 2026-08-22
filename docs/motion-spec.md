# Motion specification

> The technical companion to the seven-section storyboard. The storyboard says what the
> visitor should feel. This says what moves, when it moves, and why — in numbers.

**Status:** implemented in Phase 4.

- The scene timeline lives in [ScrollDirector.tsx](../src/components/three/ScrollDirector.tsx),
  driven by the pure state function in [motion.ts](../src/lib/motion.ts), which transcribes the
  per-chapter tables in §4. [motion.test.ts](../src/lib/motion.test.ts) asserts the continuity
  rule in §1 and the reduced-motion states in §7.
- The DOM choreography lives in
  [ScrollChoreography.tsx](../src/components/motion/ScrollChoreography.tsx) — GSAP + ScrollTrigger,
  lazy-loaded and homepage-only.

**Deviations from this document, as built:**

| § | Specified | Built | Why |
| --- | --- | --- | --- |
| 4 ch01 | Camera (0,0,8) → (0,0,6), centred | Portrait-anchored, blending to the centred path across the chapter | The Phase 3 owner ruling, already recorded in §4. Chapter 02 onward is unaffected. |
| 4 ch03 | "Four component nodes scaling 0 → 1" | Surface opacity and wireframe opacity/scale only | Nodes would be geometry the production Core replaces. The readable outcome the spec insists on — "you can now see four parts where there was one" — is carried by the shell separating from the surface plus the capability cards. |
| 6 | 2.2s load sequence including the text beats | Scene beats only; hero copy keeps FR-HOME-02's ≤700ms | The owner's ruling, recorded in §6. |
| 8 | "Postprocessing: bloom" on desktop | None | No postprocessing dependency was added. Bloom is a Phase 5 decision, not a motion one. |
| 8 | Frame-rate floor: halve particles below 24fps | Not implemented | Needs a real device to tune against. The desktop and mobile caps are in place. |

**Audience:** anyone changing the choreography. Read it top to bottom once before touching
either module above.

---

## 0. How to read this document

Three things are specified, and they carry different weight:

| Kind | Example | Weight |
| --- | --- | --- |
| **Structure** | which chapter owns which slice of scroll; what state each chapter ends in | **Binding.** Changing it changes the narrative. |
| **Values** | camera Z 8 → 6, 500 particles, 25° rotation | **Starting values.** Tune them in the browser. |
| **Constraints** | reduced-motion end states, budgets, mobile caps | **Binding.** These are requirements, not preferences. |

The camera coordinates below are honest guesses. Nothing has rendered yet, so no one — the
storyboard, the PRD, or this document — can know whether Z 6 feels close or crowded. Treat
them as a starting configuration that gets one session of tuning against the real scene, not
as acceptance criteria. **The acceptance criterion is how it feels**, and no document can
assert that.

What *is* binding is the shape: the camera travels inward through 01→02, pulls back in 03,
moves laterally in 04, sits wide in 05, settles in 06, and collapses in 07. If tuning
produces different numbers with that same shape, the tuning is right. If it produces a shape
where the camera drifts outward during the statement, something has gone wrong.

### Sequencing

The storyboard is explicit, and it overrides any temptation to start with the impressive
part:

> "Don't start making the final 3D model yet. First build the experience with a simple
> sphere. Then get the camera + scroll + typography + transitions feeling right. Only after
> that should we create the beautiful production AI Core in Blender."

So everything below is written against **placeholder geometry** — an icosphere with a
wireframe overlay is enough to answer every question this spec asks. "The Core opens" means
whatever the placeholder can express (scale, wireframe density, emissive lift). The
production model is a later, separable piece of work, and it should be dropped into a
choreography that already feels right rather than used to paper over one that doesn't.

---

## 1. Scroll allocation

Seven chapters over the full document, expressed as normalized progress (0 at the top, 1 at
the bottom). This table is **generated from the same constant the code uses** —
`CHAPTER_RANGES` in [chapters.ts](../src/lib/chapters.ts) — so the two cannot disagree.
[chapters.test.ts](../src/lib/chapters.test.ts) asserts the ranges tile 0→1 with no gap or
overlap.

| # | Chapter | `ChapterId` | Range | Span | Why this size |
| --- | --- | --- | --- | --- | --- |
| 01 | Entry | `hero` | 0 – 12% | 12% | Short. Its opening beats are **time**-based, not scroll-based (§6) — the scroll budget only covers the handoff into the statement. |
| 02 | Statement | `introduction` | 12 – 28% | 16% | Four lines, ~4% each. Long enough that each line lands alone. |
| 03 | System | `capabilities` | 28 – 46% | 18% | Four capabilities revealed one at a time, plus the pull-back that makes them all visible at once. |
| 04 | Work | `projects` | 46 – 72% | **26%** | **Widest.** Storyboard §04: the work "should receive the most attention". Three projects at ~8.5% each. |
| 05 | How I Build | `process` | 72 – 86% | 14% | Six process nodes, but they resolve as one diagram rather than six separate reveals. |
| 06 | Person | `about` | 86 – 95% | 9% | Deliberately quiet. The motion nearly stops; a long span here would read as stalling. |
| 07 | Connection | `contact` | 95 – 100% | 5% | Collapse to a point. Short and final. |

**Chapter-local progress.** Every value below is expressed against `chapterProgress(p, id)`
— 0 at the chapter's start, 1 at its end — not against document progress. This is what
choreography actually needs: "the second of four statement lines" is a fact about position
within chapter 02, not about position in the document, and writing it as a document
percentage means every value has to be recomputed if any earlier chapter is resized.

**Continuity rule.** Each chapter's camera **start state must equal the previous chapter's
end state**. The camera is one continuous move through the whole page, not seven moves
stitched together. Any discontinuity in the table below is a bug in the table.

---

## 2. Coordinate conventions

| Convention | Value |
| --- | --- |
| Units | Arbitrary scene units. The Core is 1 unit radius at rest, so camera Z 6 means "six Core-radii out". |
| Axes | Three.js default. +Y up, +Z toward the viewer, right-handed. |
| Camera | Perspective, FOV 45°, near 0.1, far 100. |
| Target | The camera always looks at an explicit target. Where the target moves, it is stated. |
| Rotation | Degrees in this document, radians in code. Y-axis unless stated. |
| Emissive | 0–3, where 1 is "clearly lit" and 3 is "the brightest thing in the frame". |

---

## 3. Global choreography rules

These apply everywhere and are stated once so no chapter repeats them.

### 3.1 Text

The storyboard's own values, used for every text element on the page:

```
opacity  0  →  1
Y       40px →  0
blur     8px →  0
```

Duration is scroll-scrubbed, not timed, except in the load sequence (§6). Easing:
`power2.out`. Stagger between sibling elements: **0.08 of the parent's local range**.

Text **never leaves** once it has arrived, except where a chapter explicitly says otherwise
(02's line replacement, 07's collapse). Content that fades out on scroll is content a reader
cannot go back to.

### 3.2 The Core

One object, present from 0% to 100%, continuously transformed. It is **never destroyed and
recreated** between chapters — the whole premise of the piece is that it is the same system
being examined from different distances.

Base rotation: **a constant 2°/second on Y**, independent of scroll, running the entire time.
This is what stops the scene from looking frozen when the reader stops scrolling. Scroll-driven
rotation is added on top of it.

### 3.3 Particles

A single particle system, count varied by chapter. Counts below are **desktop**; see §8 for
mobile.

### 3.4 Scrubbing

All scroll-driven motion is scrubbed with a **0.6s smoothing lag**, not bound frame-for-frame
to the scroll position. Direct binding makes trackpad inertia and mouse-wheel steps feel like
two different websites.

### 3.5 Scroll never gets hijacked

No scroll-jacking, no forced snapping, no minimum dwell time. PRD A11Y and the storyboard
agree: the reader controls the pace. A reader who scrolls the whole page in two seconds sees
the whole story in two seconds, badly — and that is their choice to make.

---

## 4. Per-chapter specification

### Chapter 01 — Entry (`hero`) · 0 – 12%

Opens on the load sequence (§6), which finishes before the reader scrolls. The scroll range
below only choreographs the handoff into 02.

| Property | Start (local 0) | End (local 1) |
| --- | --- | --- |
| Camera position | `(0, 0, 8)` | `(0, 0, 6)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `1.0` | `1.05` |
| Core rotation Y (scroll) | `0°` | `25°` |
| Core emissive | `1.0` | `1.2` |
| Particles | `500` | `500` |

**Text.** Name and role title are already visible from the load sequence. Across local 0→1
they fade to `opacity 0.15` and drift `Y −30px` — the one place text recedes, because the
reader is moving *into* the system and the title card is what they are moving past. The
scroll cue fades to 0 by local 0.3 and does not return.

**Framing — owner ruling, Phase 3.** Chapter 01 does NOT use the centred framing in the
table above. FR-HOME-02 is P0 and specifies the hero completely: nine elements, positioning
line at largest visual weight, 60/40 text-left/photo-right above 1024px. The storyboard's §01
(Core centred, name beneath, little else) contradicts it.

**FR-HOME-02 wins; the Core moves.** The camera anchors on the hero portrait — measured at
runtime from `[data-hero-anchor]`, not hard-coded — and scales so the Core haloes it. See
`CoreFraming` in [Scene.tsx](../src/components/three/Scene.tsx). The portrait is the only
large non-text element in the hero and FR-HOME-02 already places it correctly at every
breakpoint, so anchoring to it puts the Core clear of every line of copy at every width for
free.

The camera position/target above therefore describes chapter 01's *conceptual* rest state.
Chapter 02 onward is unaffected: there is no portrait to anchor to past the hero, and the
path in §5 resumes from the centred framing.

**Why.** Slow approach. The reader has not committed to anything yet; the motion should
suggest depth without demanding attention.

---

### Chapter 02 — Statement (`introduction`) · 12 – 28%

Four lines, revealed one at a time, in the four local quarters.

| Property | Start | End |
| --- | --- | --- |
| Camera position | `(0, 0, 6)` | `(0, 0, 2.2)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `1.05` | `1.05` |
| Core rotation Y (scroll) | `25°` | `70°` |
| Core emissive | `1.2` | `2.4` |
| Particles | `500` | `900` |

**Sub-beats.** Each line owns a quarter of the chapter and uses the standard text
choreography (§3.1):

| Line | Local range | In | Out |
| --- | --- | --- | --- |
| 1 | 0.00 – 0.25 | 0.00 – 0.08 | 0.22 – 0.25 |
| 2 | 0.25 – 0.50 | 0.25 – 0.33 | 0.47 – 0.50 |
| 3 | 0.50 – 0.75 | 0.50 – 0.58 | 0.72 – 0.75 |
| 4 | 0.75 – 1.00 | 0.75 – 0.83 | — stays |

Lines 1–3 leave; **line 4 stays** and carries into 03. This is the one chapter where text
replaces itself, and it is deliberate: four statements stacked on screen at once is a
paragraph, and a paragraph is not a statement.

The lines are marked with `data-line` in
[IntroductionSection.tsx](../src/sections/IntroductionSection.tsx) — the hooks already exist.

**Camera.** The strongest inward move on the page: 6 → 2.2 units. Storyboard §02 — "the
camera gets extremely close". At 2.2 the Core fills most of the frame and its surface detail
is the dominant visual.

**Why.** This is the claim. Everything after it is evidence. The camera crowding in is what
makes a sentence feel like an assertion rather than a caption.

---

### Chapter 03 — System (`capabilities`) · 28 – 46%

The Core opens. Four components become individually visible.

| Property | Start | End |
| --- | --- | --- |
| Camera position | `(0, 0, 2.2)` | `(0, 1.5, 7)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `1.05` | `1.0` |
| Core rotation Y (scroll) | `70°` | `160°` |
| Core emissive | `2.4` | `1.6` |
| Core state | closed | **open** (see below) |
| Particles | `900` | `1200` |

**"Open."** Against placeholder geometry, opening is expressed as: wireframe opacity
`0.15 → 0.7`, four component nodes scaling `0 → 1`, and the shell's surface opacity dropping
`1.0 → 0.35`. Against the production Core it becomes a real separation of shell segments.
Both must produce the same readable outcome: *you can now see four parts where there was
one.* An implementation that satisfies the numbers but not that sentence is wrong.

**Sub-beats.** Four capability cards, staggered across local 0.15 → 0.85, one per quarter,
standard text choreography. Each card's reveal is paired with its component node reaching
full scale and a brief emissive pulse (`+0.4`, decaying over 0.1 local) — the pairing is the
point: the card names the capability, the light says where it lives.

The cards carry `data-capability` in
[CapabilitiesSection.tsx](../src/sections/CapabilitiesSection.tsx).

**Camera.** Pulls back and lifts to +1.5 Y. The rise matters as much as the retreat: looking
slightly down at an opened object reads as inspection, looking level at it reads as a
portrait.

**Data binding.** Four capabilities, from [capabilities.ts](../src/content/capabilities.ts).
If that file gains a fifth, the stagger divides by `CAPABILITIES.length` — do not hard-code
four in the timeline.

**Why.** The reader has been told what he builds. Now they see it has parts. This is the
transition from claim to structure.

---

### Chapter 04 — Work (`projects`) · 46 – 72% · **widest**

Three destinations. The camera travels between them laterally.

| Property | Start | End |
| --- | --- | --- |
| Camera position | `(0, 1.5, 7)` | `(0, 0.5, 9)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `1.0` | `0.85` |
| Core rotation Y (scroll) | `160°` | `250°` |
| Core emissive | `1.6` | `1.4` |
| Particles | `1200` | `1200` |

**Structure.** The chapter divides into an approach and one segment per project:

| Beat | Local range | Camera position | Camera target |
| --- | --- | --- | --- |
| Approach | 0.00 – 0.15 | `(0, 1.5, 7)` → `(−3, 0.8, 6)` | `(0,0,0)` → `(−3, 0, 0)` |
| Project 1 | 0.15 – 0.42 | hold near `(−3, 0.8, 6)` | `(−3, 0, 0)` |
| Project 2 | 0.42 – 0.69 | → `(0, 0.8, 6)` | → `(0, 0, 0)` |
| Project 3 | 0.69 – 0.92 | → `(3, 0.8, 6)` | → `(3, 0, 0)` |
| Exit | 0.92 – 1.00 | → `(0, 0.5, 9)` | → `(0, 0, 0)` |

Each project sits at its own point in space (`x = −3, 0, +3`). Moving between them is a
lateral dolly with the target moving in parallel, so the projects pass through frame rather
than the camera swinging around a fixed point. Within a project's segment, the reveal is:
number → title → summary → claims, standard choreography, stagger 0.08.

**The counter.** Reads `01 / 03` style, and both halves are **derived from the query**, never
written down. There are three published projects today; if a fourth is published the counter
must read `01 / 04` without anyone editing the timeline. This is the same rule as the
capability count, and it exists because a hard-coded total is a lie waiting for the next
publish.

**Segment boundaries are computed**, not listed: `0.15 + (0.77 × i / n)` for project `i` of
`n`. The table above is that formula evaluated at `n = 3`, shown for readability. Implement
the formula.

**Data binding — `listProjects()`, the published set, uncapped.**

Deliberately **not** `useFeaturedProjects`, which the homepage strip uses. That hook takes a
`limit` and the homepage passes 3, because FR-HOME-06 specifies "up to three featured
projects". Reusing it here would cap the chapter at three forever: publish a fourth project
and the counter would still read `01 / 03`, which is exactly the hard-coded total this rule
exists to prevent — just hidden inside a default argument instead of written in the timeline.

The two consumers answer different questions and should not share a query:

| Consumer | Question | Source | Cap |
| --- | --- | --- | --- |
| Homepage strip (2D) | "three proof points" | `useFeaturedProjects(3)` | 3, per FR-HOME-06 |
| Chapter 04 (3D) | "the work" | `listProjects()` | none |

Today they return the same three records — all three published projects are featured — so
the distinction costs nothing now and is what keeps the counter honest later.

No project name, slug, or metric appears in the timeline code. The qualitative claim band
comes from [project-claims.ts](../src/content/project-claims.ts) — and stays qualitative; the
invented percentages from the original mockup are not coming back.

**Why.** This is the evidence, and it is the reason anyone is on the page. It gets the most
scroll, the most camera work, and the most room.

---

### Chapter 05 — How I Build (`process`) · 72 – 86%

The six-stage pipeline, seen as a whole.

| Property | Start | End |
| --- | --- | --- |
| Camera position | `(0, 0.5, 9)` | `(0, 2.5, 11)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `0.85` | `0.7` |
| Core rotation Y (scroll) | `250°` | `290°` |
| Core emissive | `1.4` | `1.2` |
| Particles | `1200` | `800` |

**Sub-beats.** Six nodes lighting in sequence across local 0.1 → 0.8, each with a connecting
line drawing to the next (`scaleX 0 → 1`, `power1.inOut`). The nodes come from
`PROCESS_STEPS` in [ProcessSection.tsx](../src/sections/ProcessSection.tsx); the stagger
divides by `PROCESS_STEPS.length`.

The diagram itself is existing 2D DOM — `PipelineDiagram`. The 3D layer only lights and
recedes behind it. **Do not rebuild the pipeline in 3D**: it is an ordered list with real
semantics that survives with CSS off, and turning it into geometry would trade a working
accessible thing for a prettier broken one.

**Camera.** The widest position on the page, and the highest. Process is the one thing here
that is genuinely a system diagram, and diagrams are read from above.

**Why.** The reader has seen what he builds and that it works. This answers *how*, which is
the question that turns interest into a conversation.

---

### Chapter 06 — Person (`about`) · 86 – 95%

Deliberately the quietest chapter on the page.

| Property | Start | End |
| --- | --- | --- |
| Camera position | `(0, 2.5, 11)` | `(0, 0.8, 8)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `0.7` | `0.9` |
| Core rotation Y (scroll) | `290°` | `310°` |
| Core emissive | `1.2` | `1.0` |
| Particles | `800` | `400` |

The smallest rotation delta on the page (20°) and a falling particle count. Everything slows.
Text uses the standard choreography with **no stagger** — the paragraph arrives as one block.

**Why.** Every chapter so far has been a system. This one is a person, and the motion should
stop performing. The restraint is the content.

---

### Chapter 07 — Connection (`contact`) · 95 – 100%

Collapse to a point.

| Property | Start | End |
| --- | --- | --- |
| Camera position | `(0, 0.8, 8)` | `(0, 0, 5)` |
| Camera target | `(0, 0, 0)` | `(0, 0, 0)` |
| Core scale | `0.9` | `0.25` |
| Core rotation Y (scroll) | `310°` | `360°` |
| Core emissive | `1.0` | `2.8` |
| Particles | `400` | `120`, converging inward |

The Core shrinks while getting brighter — small and intense rather than small and gone. Y
rotation lands on exactly 360°: the system ends where it started, having been examined all
the way round.

**Text.** The contact form and its heading arrive with standard choreography by local 0.4 and
are **fully readable and fully interactive** for the rest of the range. The form is the
conversion point of the entire page; no part of it may be waiting on a scroll position to
become usable.

**Why.** The closing gesture. Everything converges; the only thing left to do is write.

---

## 5. Camera path summary

The whole page in one view. Read down the Z column: in, in, out, out, out, in, in.

| Chapter | Position → | Z |
| --- | --- | --- |
| 01 Entry | `(0, 0, 8)` → `(0, 0, 6)` | 8 → 6 |
| 02 Statement | `(0, 0, 6)` → `(0, 0, 2.2)` | 6 → **2.2** (closest) |
| 03 System | `(0, 0, 2.2)` → `(0, 1.5, 7)` | 2.2 → 7 |
| 04 Work | `(0, 1.5, 7)` → `(0, 0.5, 9)`, lateral ±3 X | 7 → 9 |
| 05 How I Build | `(0, 0.5, 9)` → `(0, 2.5, 11)` | 9 → **11** (widest) |
| 06 Person | `(0, 2.5, 11)` → `(0, 0.8, 8)` | 11 → 8 |
| 07 Connection | `(0, 0.8, 8)` → `(0, 0, 5)` | 8 → 5 |

The narrative shape: **approach → confront → understand → survey → step back → return →
close.** If tuning changes the numbers but preserves that arc, it is right.

---

## 6. Load sequence (time-based, not scroll)

Chapter 01's opening runs on a clock and completes whether or not the reader scrolls. It is
the only timed sequence in the document.

| t | Beat |
| --- | --- |
| 0.0s | Black. Nothing rendered. |
| 0.3s | Particles fade in, `opacity 0 → 1` over 0.5s |
| 0.8s | Core materialises, `scale 0 → 1` with `back.out(1.4)` over 0.7s |
| 1.2s | Core rotation begins (the constant 2°/s of §3.2) |
| 1.5s | Name, standard text choreography |
| 1.8s | Role title, standard text choreography |
| 2.2s | Scroll cue, `opacity 0 → 0.6`, then a 2s loop |

**Total: 2.2s to a complete first impression — for the SCENE only.**

**Owner ruling: the PRD wins for text, the storyboard for the Core.** FR-HOME-02 specifies a
hero copy reveal of ≤700ms total at 70ms intervals, and "no looping animation". Those two
clauses were written about the hero's own content, and that requirement stands: a visitor is
reading in under a second.

So the beats above split in two:

| Beats | Owner | Timing |
| --- | --- | --- |
| Particles, Core materialise, Core rotation | the scene | as above — 0.3s to 1.2s |
| Name, role title, positioning line, intro, CTAs, socials | FR-HOME-02 | **≤700ms total, 70ms stagger** |
| Scroll cue | the scene | 2.2s |

The Core's constant 2°/s rotation (§3.2) continues to run. It is background, not hero
content, and "no looping animation" in FR-HOME-02 governs the copy reveal it appears in.
Under `prefers-reduced-motion` it stops anyway — see §7.

Three constraints on this sequence, and they are not negotiable:

1. **It must not block content.** The HTML text of chapter 01 is present, styled, and
   readable from first paint. The sequence animates elements that are already in the
   document; it does not gate their existence. If the 3D bundle never loads, the reader sees
   a correctly typeset hero and never knows anything was missing.
2. **A reader who scrolls during it wins.** Scrolling before 2.2s jumps the load sequence to
   its end state immediately and hands control to the scroll timeline. Never make someone
   wait through an animation they have already tried to skip.
3. **It runs once per page load**, not on re-entry to chapter 01 by scrolling up.

---

## 7. Reduced motion

Per PRD **A11Y-10** and spec §22. `prefers-reduced-motion: reduce` is honoured at the
timeline level, not by hiding the canvas.

**The rule: every chapter renders its END state, reached without travel.**

Stated per chapter rather than as a blanket "disable animations" because those two things
give opposite results here. A global disable leaves the Core at scale 0 and the particle
count at 0 — the reader gets a black rectangle, which is not a calmer experience, it is a
broken one.

| Chapter | Reduced-motion state |
| --- | --- |
| 01 | Camera `(0, 0, 6)`. Core scale 1.05, emissive 1.2, 500 particles. Text at full opacity — it does **not** recede. |
| 02 | Camera `(0, 0, 2.2)`. **All four lines visible at once**, statically. The replacement choreography is motion; the content is not. |
| 03 | Camera `(0, 1.5, 7)`. Core open, all four components visible, all four cards visible. |
| 04 | Camera `(0, 0.5, 9)`, centred — **no lateral travel**. All three projects visible as a static layout. |
| 05 | Camera `(0, 2.5, 11)`. All six nodes lit, all connectors drawn. |
| 06 | Camera `(0, 0.8, 8)`. Static. |
| 07 | Camera `(0, 0, 5)`. Core at 0.25 scale, form fully interactive. |

Additionally, under reduced motion:

- The constant 2°/s Core rotation **stops**. It is ambient motion with no informational
  content, and ambient motion is exactly what the preference is about.
- The load sequence (§6) is skipped entirely; the page arrives in its end state.
- Particle counts hold at each chapter's end value; particles do not drift.
- **Every word of content is present.** Nothing is revealed by scrolling that is not already
  there. This is the property to test: turn the preference on, disable JavaScript's timeline,
  and confirm the page reads identically.

---

## 8. Mobile and performance

| Constraint | Desktop | Mobile (< 768px) |
| --- | --- | --- |
| Particles (peak, ch. 03/04) | 1200 | **300** |
| Particles (baseline) | 500 | 150 |
| `devicePixelRatio` cap | 2 | **1.5** |
| Postprocessing | bloom | **none** |
| Shadows | off | off |
| Lateral camera travel (ch. 04) | ±3 X | **±1.2 X** |
| Target frame rate | 60 | 30 sustained |

Mobile keeps every camera *move* — the narrative is the same — but shortens the lateral
travel, because ±3 units on a 390px viewport swings projects off-frame entirely.

**Frame-rate floor.** If measured FPS stays below 24 for 2 continuous seconds, drop particles
by half and disable postprocessing, once. Do not oscillate: a scene that repeatedly degrades
and restores is worse than one that is permanently simpler.

### Budgets — PERF-05

| Target | Budget (gz) | Enforced by |
| --- | --- | --- |
| Home, including the lazy 3D scene | **650 KB** | `verify:ui` |
| Shared shell (every route) | **190 KB** | `verify:ui` |
| Any other single route | **180 KB** | `verify:ui` |

These are asserted in [verify-ui.mjs](../scripts/verify-ui.mjs) **before any 3D dependency
exists**, so the first `npm install three` either fits or fails loudly. The shell budget is
the important one: it is what proves the scene is genuinely deferred rather than merely
`import()`-shaped.

If Phase 2 lands over budget, that is a reason to report it and re-decide — not to raise the
number.

---

## 9. Data bindings

Nothing in the timeline hard-codes content. Every count comes from the data.

| Chapter | Source | What the timeline may read |
| --- | --- | --- |
| 03 | [capabilities.ts](../src/content/capabilities.ts) | `CAPABILITIES.length` for the stagger |
| 04 | `listProjects()` — published, uncapped | `projects.length` for segment boundaries **and the counter** |
| 05 | `PROCESS_STEPS` | `.length` for the node sequence |
| all | [chapters.ts](../src/lib/chapters.ts) | `CHAPTER_RANGES`, `chapterProgress()` |

Three projects are published today and all three are featured. The spec assumes **`n`**, not
three.

Chapter 04 reads the **published** set rather than the featured one, so the counter tracks
what the owner actually publishes — see the data-binding note in §4. The homepage's 2D strip
keeps `useFeaturedProjects(3)` and its FR-HOME-06 cap of three.

---

## 10. Existing hooks

Phase 1 established these so Phase 4 adds animation and nothing else. They are already in the
DOM:

| Hook | Where | Purpose |
| --- | --- | --- |
| `data-chapter="<id>"` | `Chapter` wrapper, all seven | ScrollTrigger anchor |
| `data-line="<i>"` | `IntroductionSection` | 02's four statement lines |
| `data-capability="<i>"` | `CapabilitiesSection` | 03's four cards |
| `data-scene-container` | `SceneContainer` | Where the canvas mounts |
| `useScrollProgress()` | `src/hooks/useScrollProgress.ts` | One rAF-coalesced listener; `progress` + `activeChapter` |
| `CHAPTER_RANGES`, `chapterProgress()` | `src/lib/chapters.ts` | The allocation in §1 |

`SceneContainer` is `fixed inset-0 -z-10`, `pointer-events-none`, `aria-hidden`. The 3D layer
is never in the tab order and never intercepts a click. Whatever mounts inside it inherits
those properties and must not override them.

---

## 11. Non-negotiables

The list of things that make this a portfolio rather than a demo. Any of them broken means
the chapter is wrong, regardless of how the motion looks.

1. **Content exists in HTML, always.** The 3D layer is decoration over a working document.
   With JavaScript disabled, WebGL unavailable, or the bundle failed, every word is still
   there and every link still works.
2. **Nothing is revealed only by scrolling.** Scroll changes emphasis, never availability.
3. **The heading outline is untouched.** One `h1`, `h2` per chapter, no skipped levels. The
   choreography animates elements; it does not restructure the document.
4. **Focus order follows the DOM.** The canvas is `aria-hidden` and unfocusable.
5. **Reduced motion is a first-class path**, not a fallback — §7.
6. **No scroll-jacking.** §3.5.
7. **The counter is derived.** §4, chapter 04.
8. **No invented metrics.** The qualitative claim band stands. If a number cannot be
   defended, it does not appear.

---

## 12. Open questions

Carried forward rather than silently resolved:

- **Q-25** — no font binaries in the repo. `--font-display` names Geist and Space Grotesk and
  falls through to the system stack. The storyboard's typography assumes a display face that
  is currently not being served.
- **Role title** — the storyboard's §01 reads "AI DEVELOPER"; the database says "AI Automation
  Executive", which the owner has confirmed should stay. The hero renders the database value.
- **Homepage composition** — Impact, Experience, Skills and Education currently sit *after*
  the seven chapters. Whether they stay there, move, or are cut is unresolved. Education has
  no route of its own, so cutting it would remove it from the site entirely.
- **Accent under emissive** — indigo/lavender is verified for contrast and stays. A bright
  emissive material will read bluer than the token. This is accepted: light is not text, and
  no contrast requirement applies to it. Worth a look once something renders.

---

## 13. Option C — screen-position constraint (Phase 4 addendum)

The spec aims the camera at the world origin for most chapters, which puts the Core dead centre
— where body copy lives. Measured against composited pixels, that failed WCAG 1.4.3 at 13 of 26
section-aligned positions.

Owner ruling: keep the brightness, move the Core. The choreography still decides where the Core
*wants* to be; measured text geometry decides where it *may* be, and a search picks the nearest
clear position to the nominal one. Implemented in
[coreFraming.ts](../src/lib/coreFraming.ts) (pure) and
[useTextGeometry.ts](../src/hooks/useTextGeometry.ts) (measurement), applied in ScrollDirector.

**Deviation from §4 and §5:** the camera's *screen framing* is no longer purely what the
per-chapter tables specify. Distance, scale, rotation, emissive and particle counts are untouched;
only the pan is constrained. Where the viewport has room the constraint is a no-op and the tables
apply exactly.

**Text on an opaque surface is excluded** from the geometry the Core avoids. Card and chip text
composites against its own background and its contrast never changes; treating it as must-avoid
filled the search space and pushed the Core onto the section headings, which were the exposed text.

**Chapter 03 cannot be fully satisfied at 1280x900.** Its camera comes to Z 2.2 and the Core's
silhouette is then wider than the gap between the section heading and the capability cards. No
screen position avoids both. Recorded rather than resolved by widening a tolerance.
