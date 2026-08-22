import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import { Vector3 } from 'three'

import { SCENE } from '@/components/three/sceneConstants'
import { useHeroFraming } from '@/components/three/useHeroFraming'
import { useChapterTimeline } from '@/hooks/useChapterTimeline'
import { useTextGeometry } from '@/hooks/useTextGeometry'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { CHAPTERS, type ChapterId } from '@/lib/chapters'
import { resolveChapter } from '@/lib/chapterTimeline'
import { findClearScreenPosition, type BottomBleed, type ScreenRect } from '@/lib/coreFraming'
import {
  motionStateForChapter,
  reducedMotionStateFor,
  withHoldCalm,
  type MotionOptions,
  type MotionState,
} from '@/lib/motion'

/**
 * Phase 4 — the scroll timeline, applied.
 *
 * One writer for the whole scene. Every frame this computes the spec state for
 * the current scroll position, damps toward it, and publishes the result into a
 * shared ref that AICore and ParticleField read. Nothing else touches the
 * camera; nothing else decides a scale or a particle count.
 *
 * WHY NOT GSAP HERE
 *
 * GSAP drives the DOM choreography (see ScrollChoreography) and earns its place
 * there. Inside the render loop it would be a liability: GSAP tweens on its own
 * ticker, so it would write to three.js objects between frames rather than in
 * them, and the r3f frameloop would sometimes render a half-applied state. The
 * scene already has a per-frame callback with a delta — the right place to
 * integrate motion is there.
 *
 * DAMPING, NOT DIRECT BINDING — motion spec section 3.4
 *
 * "All scroll-driven motion is scrubbed with a 0.6s smoothing lag, not bound
 * frame-for-frame to the scroll position." Frame-rate-independent exponential
 * smoothing: the same lag on a 60Hz laptop and a 120Hz phone, which a fixed
 * per-frame factor would not give.
 */

/** Section 3.4 — the scrub lag, in seconds. */
const SMOOTHING_SECONDS = 0.6

/**
 * How often the clear-region search runs, in milliseconds.
 *
 * The search itself is 221 cheap probes, but it reads a text-geometry array
 * that only changes on reflow, so running it every frame would be recomputing
 * the same answer sixty times a second. The 0.6s damping already smooths the
 * result, so a coarse cadence is invisible — and keeping it coarse is what
 * stops the constraint reading as a second, competing animation.
 */
const CONSTRAINT_INTERVAL_MS = 100

/**
 * The one chapter allowed to run past the bottom of frame.
 *
 * Narrow by design rather than a general capability. Chapter 03 inherits
 * chapter 02's Z 2.2 closest approach while its own heading is already on
 * screen, so its Core cannot be both contained and clear of the description —
 * measured at 1.98:1 against 4.5:1. Every other chapter has a contained answer,
 * and handing them all a licence to crop would trade the Phase 3 containment
 * rule away for a problem they do not have.
 *
 * Even here it is conditional: the search only bleeds when no contained
 * candidate clears the text.
 */
const BLEED_CHAPTER: ChapterId = 'capabilities'

/** Section 8 — lateral travel narrows on a phone. */
const LATERAL_SPAN_DESKTOP = 3
const LATERAL_SPAN_MOBILE = 1.2

/**
 * Frame-rate-independent exponential approach.
 *
 * `1 - exp(-dt / tau)` rather than a constant per-frame lerp factor: a fixed
 * factor makes the lag depend on the display's refresh rate, so the same page
 * feels sluggish at 60Hz and twitchy at 144Hz.
 */
function damp(current: number, target: number, dt: number, tau = SMOOTHING_SECONDS): number {
  return current + (target - current) * (1 - Math.exp(-dt / tau))
}

/**
 * Move a camera so the world origin lands clear of the text.
 *
 * The camera is PANNED, never re-aimed: the same delta goes onto the position
 * and the look-at target, so the viewing angle the choreography chose survives
 * and only the framing changes. Re-aiming would rotate the Core relative to the
 * light and quietly alter the shading the spec's emissive values assume.
 *
 * Returns the constrained screen position so the caller can cache it.
 */
function constrainToClearRegion(
  camera: { position: Vector3; lookAt: (x: number, y: number, z: number) => void },
  probe: Vector3,
  target: MotionState,
  textRects: readonly ScreenRect[],
  viewport: { width: number; height: number },
  fovDegrees: number,
  bottomBleed: BottomBleed,
): { x: number; y: number } {
  // Where the choreography currently puts the Core, measured rather than
  // assumed: projecting the origin through the spec camera handles chapter 04's
  // lateral stations for free, and they must keep reading as lateral.
  camera.position.set(target.camera[0], target.camera[1], target.camera[2])
  camera.lookAt(target.target[0], target.target[1], target.target[2])
  ;(camera as unknown as { updateMatrixWorld: (f?: boolean) => void }).updateMatrixWorld(true)
  probe.set(0, 0, 0).project(camera as never)

  const nominal = { x: (probe.x + 1) / 2, y: (1 - probe.y) / 2 }

  /*
   * The frustum at the Core's depth, which is what converts a screen-space
   * correction into world units. Distance is taken along the view axis, so a
   * chapter that pulls back to Z 11 gets a proportionally larger world offset
   * for the same fraction of the screen.
   */
  const distance = Math.abs(target.camera[2] - target.target[2]) || 1
  const visibleHeight = 2 * distance * Math.tan((fovDegrees * Math.PI) / 360)
  const visibleWidth = visibleHeight * (viewport.width / viewport.height)

  /*
   * The silhouette PLUS its glow, not the sphere.
   *
   * Two corrections stacked here, both learned from measurement:
   *
   *   - the wireframe shell, not the sphere, is the outer silhouette; Phase 3
   *     had to make the same correction for containment after the Core was
   *     cropped at 1280x900
   *   - an emissive body lifts the background luminance well past its own edge,
   *     and the readings showed it: a run of failures clustered at 3.96-4.46:1
   *     against 4.5, on text clear of the sphere but sitting in its halo.
   *     Avoiding only the geometry leaves those exactly where they were.
   */
  const radiusPx =
    ((target.scale * SCENE.wireShellScale * SCENE.glowAvoidanceRatio) / visibleHeight) *
    viewport.height

  const chosen = findClearScreenPosition(
    textRects,
    viewport,
    radiusPx,
    nominal,
    SCENE.heroEdgeMarginPx,
    bottomBleed,
  )

  pan(target, nominal, chosen, visibleWidth, visibleHeight)
  return chosen
}

/** Re-apply an already-chosen screen position without re-running the search. */
function applyScreenPosition(
  camera: { position: Vector3; lookAt: (x: number, y: number, z: number) => void },
  probe: Vector3,
  target: MotionState,
  chosen: { x: number; y: number },
  viewport: { width: number; height: number },
  fovDegrees: number,
): void {
  camera.position.set(target.camera[0], target.camera[1], target.camera[2])
  camera.lookAt(target.target[0], target.target[1], target.target[2])
  ;(camera as unknown as { updateMatrixWorld: (f?: boolean) => void }).updateMatrixWorld(true)
  probe.set(0, 0, 0).project(camera as never)

  const nominal = { x: (probe.x + 1) / 2, y: (1 - probe.y) / 2 }
  const distance = Math.abs(target.camera[2] - target.target[2]) || 1
  const visibleHeight = 2 * distance * Math.tan((fovDegrees * Math.PI) / 360)
  const visibleWidth = visibleHeight * (viewport.width / viewport.height)

  pan(target, nominal, chosen, visibleWidth, visibleHeight)
}

/** Shift the camera and its target together: a pan, never a re-aim. */
function pan(
  target: MotionState,
  nominal: { x: number; y: number },
  chosen: { x: number; y: number },
  visibleWidth: number,
  visibleHeight: number,
): void {
  const dx = -(chosen.x - nominal.x) * visibleWidth
  const dy = (chosen.y - nominal.y) * visibleHeight
  target.camera = [target.camera[0] + dx, target.camera[1] + dy, target.camera[2]]
  target.target = [target.target[0] + dx, target.target[1] + dy, target.target[2]]
}

export function ScrollDirector({
  motionRef,
  reducedMotion,
  isMobile,
  projectCount,
  particleCap,
}: {
  motionRef: MutableRefObject<MotionState | null>
  reducedMotion: boolean
  isMobile: boolean
  projectCount: number
  particleCap: number
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const { activeChapter } = useScrollProgress()
  const heroFraming = useHeroFraming(size)

  /*
   * Chapter progress comes from where the sections actually are, not from a
   * share of total document height. See chapterTimeline.ts — the fixed
   * percentages played chapter 03's bright, close Core over the Impact section
   * and produced measured WCAG failures at three scroll bands.
   */
  const bands = useChapterTimeline(CHAPTERS)

  /*
   * Where the words are — measured on reflow, subtracted per frame. The Core is
   * steered away from these rather than dimmed on top of them, which is the
   * Phase 3 ruling applied to every chapter.
   */
  const textRects = useTextGeometry()

  const options = useMemo<MotionOptions>(
    () => ({
      projectCount,
      lateralSpan: isMobile ? LATERAL_SPAN_MOBILE : LATERAL_SPAN_DESKTOP,
      particleCap,
    }),
    [projectCount, isMobile, particleCap],
  )

  /** The damped state actually rendered, as opposed to the scroll's target. */
  const current = useRef<MotionState | null>(null)

  /** Reused so the per-frame projection allocates nothing. */
  const probe = useRef(new Vector3())
  /** Last constraint result, and when it was computed. */
  const constraint = useRef<{ at: number; x: number; y: number; chapter: number } | null>(null)

  useFrame((_state, delta) => {
    /*
     * A11Y-10 / section 7 — reduced motion takes the end state of the chapter
     * the reader is in, with no travel and no damping.
     *
     * The hero is the one exception, and deliberately: section 7's table gives
     * chapter 01 the centred camera, but the Phase 3 ruling replaced chapter
     * 01's framing with the portrait anchor and that ruling is recorded in
     * section 4. Handing a reduced-motion reader the centred framing would show
     * them a different hero from everyone else — a composition nobody approved.
     */
    if (reducedMotion) {
      // The same calm applies with motion off — it is a brightness rule about
      // where the reader is, not an animation. Resolved from the bands rather
      // than from activeChapter because only the bands know about the hold.
      const holding = resolveChapter(bands, window.scrollY)?.holding ?? false
      const still = withHoldCalm(reducedMotionStateFor(activeChapter ?? 'hero', options), holding)
      const state: MotionState =
        activeChapter === null || activeChapter === 'hero'
          ? { ...still, camera: [heroFraming?.cameraX ?? 0, heroFraming?.cameraY ?? 0, 8] }
          : still

      const isHero = activeChapter === null || activeChapter === 'hero'
      if (heroFraming && isHero) {
        state.scale = heroFraming.scale
      }

      /*
       * The clear-region constraint applies here too — it is positioning, not
       * motion, and a reduced-motion reader is owed the same legibility.
       *
       * Re-evaluated only when the chapter changes, never on scroll. Recomputing
       * it as the reader scrolled would make the scene state change every frame,
       * which would invalidate on every frame and turn frameloop="demand" back
       * into a continuous render loop — the exact thing section 7 asks us not to
       * do. The hero keeps its Phase 3 framing untouched.
       */
      if (!isHero) {
        const chapterIndex = CHAPTERS.indexOf(activeChapter)
        if (constraint.current?.chapter !== chapterIndex) {
          const scrollY = window.scrollY
          const visible: ScreenRect[] = []
          for (const rect of textRects) {
            const y = rect.y - scrollY
            if (y + rect.height > 0 && y < size.height) {
              visible.push({ x: rect.x, y, width: rect.width, height: rect.height })
            }
          }
          const chosen = constrainToClearRegion(
            camera,
            probe.current,
            state,
            visible,
            size,
            SCENE.fov,
            activeChapter === BLEED_CHAPTER ? 'ifNeeded' : 'never',
          )
          constraint.current = {
            at: performance.now(),
            chapter: chapterIndex,
            x: chosen.x,
            y: chosen.y,
          }
        } else {
          applyScreenPosition(camera, probe.current, state, constraint.current, size, SCENE.fov)
        }
      }

      // Only write when something actually changed — with frameloop="demand"
      // this runs once per chapter change rather than sixty times a second.
      const changed = JSON.stringify(current.current) !== JSON.stringify(state)
      if (changed) {
        current.current = state
        motionRef.current = state
        camera.position.set(state.camera[0], state.camera[1], state.camera[2])
        camera.lookAt(state.target[0], state.target[1], state.target[2])
        camera.updateProjectionMatrix()
        invalidate()
      }
      return
    }

    const resolved = resolveChapter(bands, window.scrollY)
    // Nothing measurable yet — the sections have not mounted. Holding the
    // opening state is better than guessing at one.
    if (!resolved) return

    const target = withHoldCalm(
      motionStateForChapter(resolved.index, resolved.local, options),
      resolved.holding,
    )

    /*
     * Chapter 01 hands over from the hero framing to the spec's path.
     *
     * Phase 3 anchors the Core on the portrait; section 4 of the spec starts
     * the timeline centred. Both are correct — for different moments. Blending
     * across chapter 01 means the reader sees the approved hero at rest, and by
     * the time the statement arrives the camera is on the documented path.
     * Nothing after chapter 01 is affected: `blend` is 0 from 12% onward.
     */
    let heroWeight = 0
    if (heroFraming) {
      // Blend out across chapter 01's own band, whatever that band turns out to
      // be at this viewport — the hero's height changes with the breakpoint.
      const blend = resolved.index === 0 ? 1 - resolved.local : 0
      if (blend > 0) {
        target.camera = [
          target.camera[0] + heroFraming.cameraX * blend,
          target.camera[1] + heroFraming.cameraY * blend,
          target.camera[2],
        ]
        target.target = [
          target.target[0] + heroFraming.cameraX * blend,
          target.target[1] + heroFraming.cameraY * blend,
          target.target[2],
        ]
        target.scale = target.scale + (heroFraming.scale - target.scale) * blend
      }
      heroWeight = blend
    }

    /*
     * Steer the Core clear of the text — the Option C constraint.
     *
     * Weighted by `1 - heroWeight` so chapter 01 keeps the approved
     * portrait-anchored composition exactly as Phase 3 left it, and the
     * constraint fades in as the hero framing fades out. Without that the two
     * systems would both claim the hero and the reader would see the approved
     * hero shift as soon as the page loaded.
     */
    if (heroWeight < 1) {
      const now = performance.now()
      const cached = constraint.current
      const stale =
        !cached || cached.chapter !== resolved.index || now - cached.at > CONSTRAINT_INTERVAL_MS

      if (stale) {
        // Viewport-space: the rects were measured against the document, so the
        // only per-frame work is subtracting the scroll offset.
        const scrollY = window.scrollY
        const visible: ScreenRect[] = []
        for (const rect of textRects) {
          const y = rect.y - scrollY
          if (y + rect.height > 0 && y < size.height) {
            visible.push({ x: rect.x, y, width: rect.width, height: rect.height })
          }
        }
        const chosen = constrainToClearRegion(
          camera,
          probe.current,
          target,
          visible,
          size,
          SCENE.fov,
          CHAPTERS[resolved.index] === BLEED_CHAPTER ? 'ifNeeded' : 'never',
        )
        constraint.current = { at: now, chapter: resolved.index, x: chosen.x, y: chosen.y }
      } else {
        // Between searches, re-apply the cached position rather than skipping
        // the constraint — skipping would let the camera snap back to the
        // choreography's centre for 99 frames out of every 100.
        applyScreenPosition(camera, probe.current, target, cached, size, SCENE.fov)
      }
    }

    const previous = current.current
    if (!previous) {
      // First frame: adopt the target outright. Damping from an arbitrary
      // initial state would play a swoop nobody asked for on page load.
      current.current = target
    } else {
      current.current = {
        camera: [
          damp(previous.camera[0], target.camera[0], delta),
          damp(previous.camera[1], target.camera[1], delta),
          damp(previous.camera[2], target.camera[2], delta),
        ],
        target: [
          damp(previous.target[0], target.target[0], delta),
          damp(previous.target[1], target.target[1], delta),
          damp(previous.target[2], target.target[2], delta),
        ],
        scale: damp(previous.scale, target.scale, delta),
        rotationY: damp(previous.rotationY, target.rotationY, delta),
        emissive: damp(previous.emissive, target.emissive, delta),
        // Rounded because it indexes a draw range; damping it keeps the count
        // from stepping visibly when a chapter boundary changes the target.
        particles: Math.round(damp(previous.particles, target.particles, delta)),
        open: damp(previous.open, target.open, delta),
      }
    }

    const state = current.current
    motionRef.current = state

    camera.position.set(state.camera[0], state.camera[1], state.camera[2])
    camera.lookAt(state.target[0], state.target[1], state.target[2])
    camera.updateProjectionMatrix()
  }, -1) // negative priority: runs before AICore and ParticleField read the ref

  return null
}

/** The camera distance the scene opens at, for anything that needs it. */
export const OPENING_DISTANCE = SCENE.cameraStart[2]
