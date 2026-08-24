# Phase 0 — Reference audit (measured)

Captured from `https://heynesh.com/` with Playwright/Chrome on 2026-08-24.
Values are **measured from rendered output**, not described. Raw data:
`measured-1440.json`, `measured-responsive.json`. Screenshots: `screens/`.

Per PRD R1, this records measurements only. No source, stylesheet, image, icon,
font file or copy was taken from the reference.

---

## The headline finding

**The reference is a LIGHT, warm, photo-led site — not a dark editorial one.**

| Property | Measured |
| --- | --- |
| Page background | `#d5cfbe` (warm cream) |
| Body text | `#000000` |
| Accent | High-chroma yellow — wordmark, icons, CTA pills |
| Hero headline colour | `#f8f7f3` (near-white, set over the photo) |
| Font family | `PP Neue Montreal` (Book / 500 / 700) |

Every prior direction in this project assumed a near-black background, warm-white
text, a restrained indigo accent and a minimal editorial tone. **That assumption
was wrong**, and it is the reason repeated "NESH-inspired" passes never
converged.

## Hero composition (1440×900)

Top to bottom, all inside the first viewport:

1. **Giant yellow wordmark** `NESH`, set so large the glyphs crop at both
   viewport edges; occupies roughly the top 45%
2. **Cut-out photograph of the person**, centred, overlapping and partly
   occluding the wordmark. The photograph *is* the hero visual
3. **Navigation** — black caps, pipe-separated, split left/right across the
   middle of the viewport, sitting *over* the composition rather than above it
4. **Headline** `Webflow, Applied Differently.` — 76.32px, weight 700,
   line-height 78.61px, `#f8f7f3`, set over the figure
5. **Two stat cards**, lower left, on translucent panels — `80+ Projects` and
   `7+ Years of experience`
6. **Trait list**, right, on a translucent panel — Creative · Reliable ·
   Strategist · Builder · Efficient, each with a yellow glyph
7. **Two pill CTAs** — `Book a Call`, `About Me` — solid yellow, fully rounded

## Type scale (h1, measured)

| Viewport | h1 size |
| --- | --- |
| 1440×900 | 76.32px |
| 1280×800 | 67.84px |
| 1024×768 | 54.27px |
| 768×1024 | 48.00px |
| 390×844 | 43.64px |
| 375×812 | 42.00px |

Section heading 65.95px / weight 500. Timeline entry 24.05px / weight 500 /
line-height 26.45px. Tracking is `normal` throughout — the reference does **not**
use negative tracking on display type, which our tokens currently do.

## Section inventory (heights at 1440)

| Section | Height | Padding-top |
| --- | --- | --- |
| `#hero` | 2700px | 0 |
| `#about` | 3120px | 0 |
| `#work` | 3600px | 0 |
| `#overview` — "What You Get?" | 1240px | 216px |
| `#services` | 1234px | 28.8px |
| `#webflow_journey` | 1056px | 144px |
| `#testimonial` | 847px | 144px |

Sections are tall. The hero alone is 3× viewport height, so it is a scroll-driven
sequence rather than one screen.

## Motion inventory (distinct transitions)

| Duration | Easing | Properties |
| --- | --- | --- |
| 0.2s | ease | color |
| 0.25s | ease | color |
| 0.3s | ease | background-color |
| 0.3s | ease | opacity |
| 0.3s / 0.3s | ease, ease | color, background-color |
| 0.4s | ease | font-variation-settings |
| 0.4s / 0.2s | cubic-bezier(0.25, 0.46, 0.45, 0.94) | transform, opacity |

Microinteractions sit at 200–300ms. The reveal pair is `transform, opacity` at
400ms/200ms on `cubic-bezier(0.25, 0.46, 0.45, 0.94)`.

## Responsive behaviour

`documentElement.scrollWidth > innerWidth` is **true** at 1440, 1280, 1024 and
768 — the reference itself overflows horizontally at desktop widths, a
consequence of the cropped wordmark. It does not overflow at 390 or 375.

Our `verify:ui` treats horizontal overflow as a failure (RES-12). **Reproducing
that behaviour would fail our own accessibility gate**, which §12.1 forbids
degrading. Recorded as a required divergence.

Mobile recomposes rather than stacks: the wordmark is still cropped, the
photograph is still the figure, and the cards move around it — traits upper
left, years right, projects lower left, headline below.

---

## Three hard dependencies the hero has that Moin does not

| Reference element | Requires | Moin's status |
| --- | --- | --- |
| Cut-out photograph at the centre | A professional cut-out portrait | `avatar_path` is null; monogram fallback only |
| Giant cropped wordmark | A short name — NESH is 4 glyphs | "MOIN PATEL" is 10 glyphs including the space |
| Two stat cards | Verified counts | None exist; PRD REQ-HERO-3 makes this Mode D — renders nothing |

The composition rests on all three at once. Remove the photograph, lengthen the
wordmark and empty both stat cards, and the layout loses its subject, its graphic
anchor and its left column simultaneously.

**This needs a decision before Phase 2.**

## Open questions this audit closes

- **Q1** — seven chapter bands exist. Mapping in `01-chapter-mapping.md`.
- **Q3** — no verified statistics. Mode D: renders nothing.
- **Q6** — `/contact` already exists; no booking account invented.

## Still needing the approver

- **Q2** — whether the reference honours `prefers-reduced-motion`: not yet tested.
- **Q4** — journey milestone count: read from `experience`/`education` at Phase 3.
- **Q5** — reference routes beyond the homepage: not yet enumerated.
- **Q7** — R2 clone-risk acceptance.
- **Q8 (new)** — the palette is cream / black / yellow, not dark. Adopt wholesale?
- **Q9 (new)** — the hero needs a cut-out portrait. Supply one, or diverge?
- **Q10 (new)** — the reference overflows horizontally at desktop; we must
  diverge to hold RES-12. Confirm.
