# REQ-IA-1 — Section → chapter mapping

Eleven content sections map onto exactly seven `data-chapter` bands. The chapter
count stays at seven (REQ-IA-2). Sections without a chapter nest inside the
preceding chapter's scroll range and do not break band boundaries (REQ-IA-3).

| # | PRD section | Owns a chapter? | `data-chapter` |
| --- | --- | --- | --- |
| 1 | Navigation | no — fixed chrome, outside the scroll range | — |
| 2 | Hero | yes | `hero` |
| 3 | About / Intro | yes | `introduction` |
| 4 | My Journey | yes | `about` |
| 5 | Selected Work | yes | `projects` |
| 6 | What You Get | yes | `capabilities` |
| 7 | Services (Mode C) | no — nests under `capabilities` | — |
| 8 | Credibility (Mode C) | no — nests under `process` | — |
| 9 | FAQ | no — nests under `process` | — |
| 10 | Contact | yes | `contact` |
| 11 | Footer | no — outside the tracked range | — |

`process` stays a chapter and owns the Credibility + FAQ stretch.

## The constraint that governs any reordering

`buildChapterBands` sorts by `CHAPTERS.indexOf`, so **the DOM order of
chapter-bearing sections must equal the `CHAPTERS` array order**. Reordering them
silently reassigns camera bands to different sections.

`CHAPTER_MOTION` values are protected, so a reorder is a *motion* change
requiring re-verification — not a layout change.

Current array order:

```
hero · introduction · capabilities · projects · process · about · contact
```

## Conflict to resolve before Phase 2

The PRD's reading order places **My Journey** (`about`) *before* Selected Work
(`projects`) and What You Get (`capabilities`). The array orders them
`capabilities · projects · process · about`.

Matching the PRD's order therefore requires reordering `CHAPTERS`, which
reassigns each camera band to a different section. Two options:

1. **Keep the array, accept the order.** Journey stays after Work. Zero motion
   risk, diverges from the reference's section order.
2. **Reorder `CHAPTERS` to match the PRD.** Matches the reference, but every
   section receives a different camera path and the whole choreography needs
   re-verification against the contrast gate.

This was attempted once before in this project and produced measurable
regressions — a camera-speed violation (224.9 against a 220 ceiling) and the
widest scroll allocation landing on the wrong chapter. Option 2 is viable but is
not a free change, and it needs explicit approval.
