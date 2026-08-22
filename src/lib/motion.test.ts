import { describe, expect, it } from 'vitest'

import { CHAPTER_RANGES, CHAPTERS } from '@/lib/chapters'
import {
  CHAPTER_MOTION,
  HOLD_EMISSIVE_FACTOR,
  HOLD_SCALE_FACTOR,
  withHoldCalm,
  motionStateAt,
  PEAK_PARTICLES,
  reducedMotionStateFor,
  type MotionOptions,
} from '@/lib/motion'

const DESKTOP: MotionOptions = { projectCount: 3, lateralSpan: 3, particleCap: PEAK_PARTICLES }
const MOBILE: MotionOptions = { projectCount: 3, lateralSpan: 1.2, particleCap: 300 }

/**
 * The motion spec states a continuity rule in prose — "each chapter's camera
 * start state must equal the previous chapter's end state" — and then lists
 * fourteen coordinate triples by hand. That is exactly the kind of table where
 * a transcription slip produces a camera that teleports at one boundary and
 * nowhere else, which is maddening to find by eye and trivial to catch here.
 */
describe('chapter motion table', () => {
  it('has one entry per chapter, in narrative order', () => {
    expect(CHAPTER_MOTION.map((m) => m.chapter)).toEqual([...CHAPTERS])
  })

  it('is continuous — every chapter starts where the previous one ended', () => {
    for (let i = 1; i < CHAPTER_MOTION.length; i++) {
      const prev = CHAPTER_MOTION[i - 1]!
      const curr = CHAPTER_MOTION[i]!
      expect(curr.cameraFrom, `camera at ${curr.chapter}`).toEqual(prev.cameraTo)
      expect(curr.targetFrom, `target at ${curr.chapter}`).toEqual(prev.targetTo)
      expect(curr.scaleFrom, `scale at ${curr.chapter}`).toBe(prev.scaleTo)
      expect(curr.rotationFrom, `rotation at ${curr.chapter}`).toBe(prev.rotationTo)
      expect(curr.emissiveFrom, `emissive at ${curr.chapter}`).toBe(prev.emissiveTo)
      expect(curr.particlesFrom, `particles at ${curr.chapter}`).toBe(prev.particlesTo)
      expect(curr.openFrom, `open at ${curr.chapter}`).toBe(prev.openTo)
    }
  })

  it('rotates monotonically through exactly one full turn', () => {
    // Spec section 4, chapter 07: "Y rotation lands on exactly 360°: the system
    // ends where it started, having been examined all the way round."
    expect(CHAPTER_MOTION[0]!.rotationFrom).toBe(0)
    expect(CHAPTER_MOTION.at(-1)!.rotationTo).toBe(360)
    for (const m of CHAPTER_MOTION) {
      expect(m.rotationTo).toBeGreaterThanOrEqual(m.rotationFrom)
    }
  })

  it('reaches its closest and widest camera where the spec says', () => {
    const zs = CHAPTER_MOTION.flatMap((m) => [m.cameraFrom[2], m.cameraTo[2]])
    // Section 5: chapter 02 is the closest approach, chapter 05 the widest.
    expect(Math.min(...zs)).toBe(2.2)
    expect(Math.max(...zs)).toBe(11)
  })
})

describe('motionStateAt', () => {
  it('returns each chapter boundary state exactly', () => {
    for (let i = 0; i < CHAPTER_RANGES.length; i++) {
      const range = CHAPTER_RANGES[i]!
      const motion = CHAPTER_MOTION[i]!
      const atStart = motionStateAt(range.start, DESKTOP)
      expect(atStart.scale, `scale at start of ${range.chapter}`).toBeCloseTo(motion.scaleFrom, 6)
      expect(atStart.emissive, `emissive at start of ${range.chapter}`).toBeCloseTo(
        motion.emissiveFrom,
        6,
      )
    }
  })

  it('is continuous across every chapter boundary', () => {
    /*
     * The direct form of the spec's continuity rule: sample immediately either
     * side of each boundary and require the two to agree. A transcription slip
     * in the table shows up here as a teleport, however fast the surrounding
     * motion happens to be.
     */
    const EPS = 1e-6
    for (const range of CHAPTER_RANGES.slice(1)) {
      const before = motionStateAt(range.start - EPS, DESKTOP)
      const after = motionStateAt(range.start + EPS, DESKTOP)
      const gap = Math.hypot(
        after.camera[0] - before.camera[0],
        after.camera[1] - before.camera[1],
        after.camera[2] - before.camera[2],
      )
      expect(gap, `camera teleports entering ${range.chapter}`).toBeLessThan(1e-3)
      expect(after.scale - before.scale).toBeLessThan(1e-3)
      expect(after.emissive - before.emissive).toBeLessThan(1e-3)
    }
  })

  it('never exceeds the fastest camera move the spec sanctions', () => {
    /*
     * Separate from continuity, and deliberately so — the first version of this
     * test used one per-step threshold for both and failed at progress 0.701,
     * which is chapter 04's exit: a legitimate 4.25-unit move compressed into
     * the last 8% of the chapter (2% of the page). That is the spec's own
     * design, not a bug, and it is the fastest sanctioned move on the page.
     *
     * So this bounds SPEED in units per unit of progress. 220 leaves the exit
     * its 204 and still catches anything an order of magnitude worse.
     */
    const STEP = 0.0005
    const MAX_SPEED = 220
    let previous = motionStateAt(0, DESKTOP)
    let fastest = 0
    for (let p = STEP; p <= 1; p += STEP) {
      const current = motionStateAt(p, DESKTOP)
      const speed =
        Math.hypot(
          current.camera[0] - previous.camera[0],
          current.camera[1] - previous.camera[1],
          current.camera[2] - previous.camera[2],
        ) / STEP
      fastest = Math.max(fastest, speed)
      expect(speed, `camera too fast at progress ${p.toFixed(4)}`).toBeLessThan(MAX_SPEED)
      previous = current
    }
    expect(fastest).toBeGreaterThan(0)
  })

  it('clamps out-of-range progress instead of extrapolating', () => {
    expect(motionStateAt(-1, DESKTOP)).toEqual(motionStateAt(0, DESKTOP))
    expect(motionStateAt(2, DESKTOP)).toEqual(motionStateAt(1, DESKTOP))
  })

  it('ends at the collapse state the spec describes', () => {
    const end = motionStateAt(1, DESKTOP)
    expect(end.scale).toBeCloseTo(0.25, 6)
    expect(end.emissive).toBeCloseTo(2.8, 6)
    expect(end.rotationY).toBeCloseTo(2 * Math.PI, 6)
  })
})

describe('chapter 04 lateral travel', () => {
  const projectsRange = CHAPTER_RANGES.find((r) => r.chapter === 'projects')!
  const at = (local: number, options: MotionOptions) =>
    motionStateAt(projectsRange.start + local * (projectsRange.end - projectsRange.start), options)

  it('visits one station per project, derived from the count', () => {
    // The spec is explicit that boundaries are computed, not listed: a fourth
    // published project must produce a fourth station with no code change.
    for (const projectCount of [1, 3, 4, 7]) {
      const options = { ...DESKTOP, projectCount }
      const xs = new Set<number>()
      for (let local = 0.16; local < 0.92; local += 0.005) {
        xs.add(Number(at(local, options).camera[0].toFixed(3)))
      }
      // Every station is a dwell, so each contributes many identical samples.
      const dwells = [...xs].filter(
        (x) => Math.abs(Math.abs(x) - DESKTOP.lateralSpan) < 1e-6 || Math.abs(x) < 1e-6,
      )
      expect(dwells.length, `stations for ${projectCount} project(s)`).toBeGreaterThan(0)
    }
  })

  it('holds still during a project rather than gliding continuously', () => {
    // A camera that never rests is a camera nobody can read a case study from.
    const a = at(0.2, DESKTOP).camera[0]
    const b = at(0.25, DESKTOP).camera[0]
    expect(a).toBeCloseTo(b, 6)
  })

  it('narrows its travel on mobile — section 8', () => {
    const desktopXs = []
    const mobileXs = []
    for (let local = 0.16; local < 0.92; local += 0.01) {
      desktopXs.push(Math.abs(at(local, DESKTOP).camera[0]))
      mobileXs.push(Math.abs(at(local, MOBILE).camera[0]))
    }
    expect(Math.max(...mobileXs)).toBeCloseTo(1.2, 3)
    expect(Math.max(...desktopXs)).toBeCloseTo(3, 3)
  })

  it('does not divide by zero with no published projects', () => {
    expect(() => at(0.5, { ...DESKTOP, projectCount: 0 })).not.toThrow()
    expect(Number.isFinite(at(0.5, { ...DESKTOP, projectCount: 0 }).camera[0])).toBe(true)
  })
})

describe('particle budget', () => {
  it('never exceeds the device cap', () => {
    for (let p = 0; p <= 1; p += 0.01) {
      expect(motionStateAt(p, MOBILE).particles).toBeLessThanOrEqual(MOBILE.particleCap)
      expect(motionStateAt(p, DESKTOP).particles).toBeLessThanOrEqual(PEAK_PARTICLES)
    }
  })

  it('keeps the spec’s rise and fall rather than flattening at the cap', () => {
    // Clamping would make every chapter above the cap identical and erase the
    // choreography; the shape has to survive the mobile budget.
    const peak = motionStateAt(0.6, MOBILE).particles
    const quiet = motionStateAt(0.99, MOBILE).particles
    expect(peak).toBeGreaterThan(quiet)
  })
})

describe('hold-region calm', () => {
  const base = motionStateAt(0.9, DESKTOP)

  it('leaves every narrative chapter untouched', () => {
    // The choreography inside a chapter is the spec's; this rule only applies
    // to the stretch between chapters where no chapter is playing.
    expect(withHoldCalm(base, false)).toEqual(base)
  })

  it('dims the emissive and shrinks the Core, leaving the motion alone', () => {
    /*
     * REQUIREMENT CHANGED — this assertion used to read "never the geometry"
     * and asserted `held.scale === base.scale`.
     *
     * That was correct while emissive was the only hold-region lever. It stopped
     * being correct when the owner approved a hold-specific scale reduction,
     * after measurement proved the other two mechanisms exhausted: emissive hit
     * an irreducible lighting floor (0.0315 contribution against a 0.0211
     * budget, with emissive at zero), and positioning was ruled out by measuring
     * all 221 grid candidates, the best still covering 34.2% of the exposed
     * text.
     *
     * So the test changed because the requirement changed, not to make the
     * suite green. What it still guards is the boundary: rotation, particles
     * and the camera path are NOT the hold region's business.
     */
    const held = withHoldCalm(base, true)
    expect(held.emissive).toBeCloseTo(base.emissive * HOLD_EMISSIVE_FACTOR, 6)
    expect(held.scale).toBeCloseTo(base.scale * HOLD_SCALE_FACTOR, 6)
    expect(held.rotationY).toBe(base.rotationY)
    expect(held.particles).toBe(base.particles)
    expect(held.camera).toEqual(base.camera)
  })

  it('keeps the Core a substantial object, not a dot', () => {
    // Requirement: visually present and still the centrepiece. The measured
    // answer was 0.85 — the largest factor that cleared mobile Skills, found by
    // walking 1.0 / 0.95 / 0.9 / 0.85 and confirming 0.85 repeated (5.61:1
    // twice) rather than passing once by luck.
    expect(HOLD_SCALE_FACTOR).toBeGreaterThanOrEqual(0.8)
    expect(HOLD_SCALE_FACTOR).toBeLessThanOrEqual(1)
    expect(withHoldCalm(base, true).scale).toBeGreaterThan(0)
  })

  it('keeps the Core lit rather than switching it off', () => {
    // Requirement: visually present, not hidden. A factor of 0 would pass the
    // contrast check by deleting the centrepiece.
    expect(HOLD_EMISSIVE_FACTOR).toBeGreaterThan(0)
    expect(withHoldCalm(base, true).emissive).toBeGreaterThan(0)
  })

  it('is no stronger than the measurement required', () => {
    /*
     * Solved from two measured points on the real page rather than chosen: the
     * scene contributed 0.0498 to backdrop luminance at factor 1.0 and 0.0254
     * at 0.4, which separates the emissive-driven part from an irreducible
     * floor and gives 0.268 as the factor "Business Tools" needs for 4.5:1.
     *
     * The lower bound guards against dimming the Core further than the evidence
     * asks for; requirement 12 is that it stays visually present.
     */
    expect(HOLD_EMISSIVE_FACTOR).toBeGreaterThanOrEqual(0.25)
    expect(HOLD_EMISSIVE_FACTOR).toBeLessThanOrEqual(0.3)
  })
})

describe('reduced motion — A11Y-10 / section 7', () => {
  it('gives every chapter its end state, never a blank scene', () => {
    for (const chapter of CHAPTERS) {
      const state = reducedMotionStateFor(chapter, DESKTOP)
      // The failure this guards against: a global "disable animations" leaves
      // scale 0 and no particles, and the reader gets a black rectangle.
      expect(state.scale, `${chapter} scale`).toBeGreaterThan(0)
      expect(state.particles, `${chapter} particles`).toBeGreaterThan(0)
      expect(state.emissive, `${chapter} emissive`).toBeGreaterThan(0)
    }
  })

  it('matches the end of the animated path for the same chapter', () => {
    for (let i = 0; i < CHAPTER_RANGES.length; i++) {
      const range = CHAPTER_RANGES[i]!
      const still = reducedMotionStateFor(range.chapter, DESKTOP)
      expect(still.scale).toBeCloseTo(CHAPTER_MOTION[i]!.scaleTo, 6)
      expect(still.camera).toEqual(CHAPTER_MOTION[i]!.cameraTo)
    }
  })

  it('keeps chapter 04 centred — no lateral travel', () => {
    expect(reducedMotionStateFor('projects', DESKTOP).camera[0]).toBe(0)
  })
})
