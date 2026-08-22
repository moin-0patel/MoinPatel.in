import { CHAPTER_RANGES, chapterProgress, type ChapterId } from '@/lib/chapters'

/**
 * The motion spec, as data — Phase 4.
 *
 * Every number here is transcribed from the per-chapter tables in
 * docs/motion-spec.md section 4. Nothing is invented and nothing is rounded:
 * if a value disagrees with that document, the document is right and this is a
 * bug.
 *
 * A pure module on purpose. The whole choreography reduces to one function of
 * scroll progress, which means it can be unit tested without a browser, a
 * canvas or a GPU — see motion.test.ts, which asserts the continuity rule the
 * spec states but prose cannot enforce: each chapter's start state must equal
 * the previous chapter's end state, or the camera teleports at a boundary.
 */

export type Vec3 = readonly [number, number, number]

export type ChapterMotion = {
  readonly chapter: ChapterId
  readonly cameraFrom: Vec3
  readonly cameraTo: Vec3
  readonly targetFrom: Vec3
  readonly targetTo: Vec3
  readonly scaleFrom: number
  readonly scaleTo: number
  /** Degrees. Converted to radians at the point of use. */
  readonly rotationFrom: number
  readonly rotationTo: number
  readonly emissiveFrom: number
  readonly emissiveTo: number
  readonly particlesFrom: number
  readonly particlesTo: number
  /** 0 = closed, 1 = open. Only chapter 03 moves it. */
  readonly openFrom: number
  readonly openTo: number
}

export const CHAPTER_MOTION: readonly ChapterMotion[] = [
  {
    chapter: 'hero',
    cameraFrom: [0, 0, 8],
    cameraTo: [0, 0, 6],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 1.0,
    scaleTo: 1.05,
    rotationFrom: 0,
    rotationTo: 25,
    emissiveFrom: 1.0,
    emissiveTo: 1.2,
    particlesFrom: 500,
    particlesTo: 500,
    openFrom: 0,
    openTo: 0,
  },
  {
    chapter: 'introduction',
    cameraFrom: [0, 0, 6],
    cameraTo: [0, 0, 2.2],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 1.05,
    scaleTo: 1.05,
    rotationFrom: 25,
    rotationTo: 70,
    emissiveFrom: 1.2,
    emissiveTo: 2.4,
    particlesFrom: 500,
    particlesTo: 900,
    openFrom: 0,
    openTo: 0,
  },
  {
    chapter: 'capabilities',
    cameraFrom: [0, 0, 2.2],
    cameraTo: [0, 1.5, 7],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 1.05,
    scaleTo: 1.0,
    rotationFrom: 70,
    rotationTo: 160,
    emissiveFrom: 2.4,
    emissiveTo: 1.6,
    particlesFrom: 900,
    particlesTo: 1200,
    openFrom: 0,
    openTo: 1,
  },
  {
    chapter: 'projects',
    cameraFrom: [0, 1.5, 7],
    cameraTo: [0, 0.5, 9],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 1.0,
    scaleTo: 0.85,
    rotationFrom: 160,
    rotationTo: 250,
    emissiveFrom: 1.6,
    emissiveTo: 1.4,
    particlesFrom: 1200,
    particlesTo: 1200,
    openFrom: 1,
    openTo: 1,
  },
  {
    chapter: 'process',
    cameraFrom: [0, 0.5, 9],
    cameraTo: [0, 2.5, 11],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 0.85,
    scaleTo: 0.7,
    rotationFrom: 250,
    rotationTo: 290,
    emissiveFrom: 1.4,
    emissiveTo: 1.2,
    particlesFrom: 1200,
    particlesTo: 800,
    openFrom: 1,
    openTo: 0.5,
  },
  {
    chapter: 'about',
    cameraFrom: [0, 2.5, 11],
    cameraTo: [0, 0.8, 8],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 0.7,
    scaleTo: 0.9,
    rotationFrom: 290,
    rotationTo: 310,
    emissiveFrom: 1.2,
    emissiveTo: 1.0,
    particlesFrom: 800,
    particlesTo: 400,
    openFrom: 0.5,
    openTo: 0,
  },
  {
    chapter: 'contact',
    cameraFrom: [0, 0.8, 8],
    cameraTo: [0, 0, 5],
    targetFrom: [0, 0, 0],
    targetTo: [0, 0, 0],
    scaleFrom: 0.9,
    scaleTo: 0.25,
    rotationFrom: 310,
    rotationTo: 360,
    emissiveFrom: 1.0,
    emissiveTo: 2.8,
    particlesFrom: 400,
    particlesTo: 120,
    openFrom: 0,
    openTo: 0,
  },
]

/** The largest particle count any chapter asks for — the buffer is sized once. */
export const PEAK_PARTICLES = Math.max(
  ...CHAPTER_MOTION.map((m) => Math.max(m.particlesFrom, m.particlesTo)),
)

export type MotionState = {
  camera: Vec3
  target: Vec3
  scale: number
  /** Radians, ready for three.js. */
  rotationY: number
  emissive: number
  particles: number
  open: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
]

/**
 * Chapter 04's lateral travel — motion spec section 4, chapter 04.
 *
 * The spec is explicit that the boundaries are COMPUTED, not listed: project i
 * of n occupies `0.15 + 0.77 * i / n`, and the table in the document is that
 * formula evaluated at n = 3 "shown for readability". Implementing the table
 * would hard-code three projects into the timeline, which is the exact failure
 * the derived counter exists to prevent.
 *
 * Destinations are spread across ±lateralSpan; on mobile that span narrows
 * (section 8) because ±3 units on a 390px viewport swings a project clean out
 * of frame.
 */
function projectsCamera(
  local: number,
  base: ChapterMotion,
  projectCount: number,
  lateralSpan: number,
): { camera: Vec3; target: Vec3 } {
  const n = Math.max(1, projectCount)
  const APPROACH_END = 0.15
  const EXIT_START = 0.92
  const DWELL_Y = 0.8
  const DWELL_Z = 6

  /** Where project i sits in world X: evenly spread, centred on 0. */
  const stationX = (i: number) => (n === 1 ? 0 : -lateralSpan + (2 * lateralSpan * i) / (n - 1))

  if (local <= APPROACH_END) {
    const t = local / APPROACH_END
    return {
      camera: lerpVec3(base.cameraFrom, [stationX(0), DWELL_Y, DWELL_Z], t),
      target: lerpVec3(base.targetFrom, [stationX(0), 0, 0], t),
    }
  }

  if (local >= EXIT_START) {
    const t = (local - EXIT_START) / (1 - EXIT_START)
    const last = stationX(n - 1)
    return {
      camera: lerpVec3([last, DWELL_Y, DWELL_Z], base.cameraTo, t),
      target: lerpVec3([last, 0, 0], base.targetTo, t),
    }
  }

  // Between the approach and the exit, each project owns an equal slice and
  // the camera travels laterally from one station to the next.
  const span = EXIT_START - APPROACH_END
  const pos = ((local - APPROACH_END) / span) * n
  const index = Math.min(n - 1, Math.floor(pos))
  const within = pos - index
  const from = stationX(index)
  const to = stationX(Math.min(n - 1, index + 1))
  /*
   * Dwell then travel: the first 55% of a project's slice holds the camera
   * still so the reader can actually read it, and the remainder moves on. A
   * constant glide would mean the camera is never once at rest while someone
   * is trying to read a case study.
   */
  const DWELL = 0.55
  const travel = within <= DWELL ? 0 : (within - DWELL) / (1 - DWELL)
  const x = lerp(from, to, travel)
  return { camera: [x, DWELL_Y, DWELL_Z], target: [x, 0, 0] }
}

export type MotionOptions = {
  /** Number of published projects driving chapter 04's stations. */
  projectCount: number
  /** Section 8: ±3 on desktop, ±1.2 on mobile. */
  lateralSpan: number
  /** Section 8: peak particle budget for this device. */
  particleCap: number
}

/**
 * The entire scene state at a given scroll position.
 *
 * One function, no side effects, no three.js types — which is what makes the
 * choreography testable. The renderer's only job is to apply what this returns.
 */
export function motionStateForChapter(
  chapterIndex: number,
  local: number,
  options: MotionOptions,
): MotionState {
  const index = Math.min(CHAPTER_MOTION.length - 1, Math.max(0, chapterIndex))
  const motion = CHAPTER_MOTION[index]!
  const clampedLocal = Math.min(1, Math.max(0, local))
  return interpolate(motion, clampedLocal, options)
}

/**
 * The scene state from raw document progress.
 *
 * Retained because it is the simplest expression of the §1 table and the motion
 * tests assert against it. It is NOT what drives the page any more: the fixed
 * percentages assume the document is nothing but the seven chapters, and it is
 * not. useChapterTimeline measures where the sections actually are and calls
 * motionStateForChapter directly. See chapterTimeline.ts for the full reason.
 */
export function motionStateAt(progress: number, options: MotionOptions): MotionState {
  const clamped = Math.min(1, Math.max(0, progress))

  // The chapter whose range contains this progress; the last chapter owns
  // exactly 1.0, which would otherwise fall outside every half-open range.
  const rangeIndex = Math.min(
    CHAPTER_RANGES.length - 1,
    CHAPTER_RANGES.findIndex((r) => clamped < r.end) === -1
      ? CHAPTER_RANGES.length - 1
      : CHAPTER_RANGES.findIndex((r) => clamped < r.end),
  )
  const chapter = CHAPTER_RANGES[rangeIndex]!.chapter
  const motion = CHAPTER_MOTION[rangeIndex]!
  const local = chapterProgress(clamped, chapter)
  return interpolate(motion, local, options)
}

/** The shared body of both entry points: one chapter, one local position. */
function interpolate(motion: ChapterMotion, local: number, options: MotionOptions): MotionState {
  const lateral =
    motion.chapter === 'projects'
      ? projectsCamera(local, motion, options.projectCount, options.lateralSpan)
      : null

  return {
    camera: lateral ? lateral.camera : lerpVec3(motion.cameraFrom, motion.cameraTo, local),
    target: lateral ? lateral.target : lerpVec3(motion.targetFrom, motion.targetTo, local),
    scale: lerp(motion.scaleFrom, motion.scaleTo, local),
    rotationY: (lerp(motion.rotationFrom, motion.rotationTo, local) * Math.PI) / 180,
    emissive: lerp(motion.emissiveFrom, motion.emissiveTo, local),
    // Scaled to the device budget rather than clamped: clamping would flatten
    // every chapter above the cap into one value and erase the rise and fall
    // the spec choreographs. Proportional scaling keeps the shape.
    particles: Math.round(
      lerp(motion.particlesFrom, motion.particlesTo, local) *
        (options.particleCap / PEAK_PARTICLES),
    ),
    open: lerp(motion.openFrom, motion.openTo, local),
  }
}

/**
 * How much of the Core's emissive output survives in the hold region.
 *
 * The hold is the stretch between chapter 06 and chapter 07 where the
 * non-narrative sections live — Impact, Experience, Skills, Education. The spec
 * gives them no choreography, so the scene holds chapter 06's end state across
 * them.
 *
 * Those sections are also the densest text on the page: skill chips and impact
 * paragraphs tile the viewport, so the framing search has nowhere clear to put
 * the Core and its glow tints the background behind the words. Measured, the
 * scene was adding 0.049-0.090 to backdrop luminance there, putting five
 * elements between 3.32:1 and 4.01:1 against a 4.5:1 requirement.
 *
 * 0.26 comes from measuring twice, because the first answer was wrong in an
 * instructive way. Cutting the scene's CONTRIBUTION to 40% is what the pixels
 * asked for, so the factor was set to 0.4 — but emissiveIntensity is not the
 * only thing lighting the Core. With the ambient light, the key light and the
 * material's own colour still in play, a 60% cut to emissive removed only 49%
 * of the contribution, and "Business Tools" landed at 4.23:1.
 *
 * Solving against both measured points (contribution 0.0498 at factor 1.0,
 * 0.0254 at 0.4) separates the emissive-driven part from an irreducible floor
 * of ~0.009 that no emissive change can touch, and gives 0.268. Rounded to
 * 0.26 for a little margin against measurement noise.
 *
 * This is a calm-context adjustment, not a global dim. Every narrative chapter
 * keeps its emissive choreography exactly as section 4 specifies — including
 * chapter 03's 2.4 peak — and the Core stays lit here, just quieter, which is
 * what the spec asks of this part of the page anyway.
 */
export const HOLD_EMISSIVE_FACTOR = 0.26

/**
 * How much of the Core's size survives in the hold region.
 *
 * The last lever, and only reached because the other two were measured to
 * exhaustion. Emissive stopped at an irreducible lighting floor: with it at zero
 * the ambient light, key light and particles still contributed 0.0315 against a
 * budget of 0.0211. Positioning was proven impossible — all 221 grid candidates
 * measured, the best still covering 34.2% of the exposed text, because the
 * Skills section stacks 35 text rows down the full height of a 390px viewport
 * and the Core's avoidance box left 16px of horizontal freedom.
 *
 * Size is what remains. Scoped to the hold state so the seven narrative
 * chapters keep the scale values section 4 specifies, and applied here rather
 * than anywhere else so the animated and reduced-motion paths cannot diverge.
 *
 * Second-order and useful: the framing search derives its avoidance radius from
 * this scale, so shrinking the Core also hands the positioning search room it
 * did not have. The two compound instead of competing.
 *
 * PLACEHOLDER — retuned by measurement below.
 */
export const HOLD_SCALE_FACTOR = 0.85

/**
 * Apply the hold region's calm to a state.
 *
 * Separate from motionStateForChapter so the rule is expressed once and can be
 * tested without a renderer, and so the animated and reduced-motion paths
 * cannot drift apart on it.
 */
export function withHoldCalm(state: MotionState, holding: boolean): MotionState {
  if (!holding) return state
  return {
    ...state,
    emissive: state.emissive * HOLD_EMISSIVE_FACTOR,
    scale: state.scale * HOLD_SCALE_FACTOR,
  }
}

/**
 * A11Y-10 / motion spec section 7 — the reduced-motion state for a chapter.
 *
 * "Every chapter renders its END state, reached without travel." Deliberately
 * not a global disable: with animation switched off wholesale the Core sits at
 * scale 0 with no particles, and the reader gets a black rectangle. That is not
 * a calmer experience, it is a broken one.
 *
 * Chapter 04 is the one that differs from a plain end state — the spec pins it
 * centred with no lateral travel, which a naive "end of chapter" would already
 * satisfy but only by accident. Stated explicitly so it survives a refactor.
 */
export function reducedMotionStateFor(chapter: ChapterId, options: MotionOptions): MotionState {
  const index = CHAPTER_RANGES.findIndex((r) => r.chapter === chapter)
  const motion = CHAPTER_MOTION[index === -1 ? 0 : index]!

  return {
    camera: motion.cameraTo,
    target: motion.targetTo,
    scale: motion.scaleTo,
    rotationY: (motion.rotationTo * Math.PI) / 180,
    emissive: motion.emissiveTo,
    particles: Math.round(motion.particlesTo * (options.particleCap / PEAK_PARTICLES)),
    open: motion.openTo,
  }
}
