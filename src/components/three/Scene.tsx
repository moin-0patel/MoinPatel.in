import { Canvas } from '@react-three/fiber'
import { useRef } from 'react'

import { AICore } from '@/components/three/AICore'
import { ParticleField } from '@/components/three/ParticleField'
import { ScrollDirector } from '@/components/three/ScrollDirector'
import { SCENE } from '@/components/three/sceneConstants'
import { useMediaQuery, useReducedMotion } from '@/hooks/useMediaQuery'
import { useProjects } from '@/hooks/useProjects'
import { PEAK_PARTICLES, type MotionState } from '@/lib/motion'

/**
 * The 3D scene — Phase 4.
 *
 * THE ONE MODULE THAT IMPORTS THREE.JS.
 *
 * Everything three-related is reachable only through this file's import graph,
 * and this file is only ever reached through a dynamic import in
 * SceneContainer. That is what keeps the library out of the shared shell, and
 * the shell budget in verify:ui is the assertion that proves it stayed out.
 * A static import of this module from anywhere in the entry graph would move
 * roughly 450 KB into every route on the site, including /resume — and it would
 * do so silently, which is why the budget is measured rather than assumed.
 *
 * PHASE 4 SCOPE: the scene now responds to scroll, following the per-chapter
 * tables in docs/motion-spec.md. ScrollDirector is the single writer; AICore and
 * ParticleField read what it publishes. See ScrollDirector for why the timeline
 * lives in the render loop rather than in GSAP.
 */
export default function Scene() {
  const reducedMotion = useReducedMotion()
  // Matches the motion spec's section 8 mobile threshold and RES-01's
  // breakpoint, so the scene degrades on the same devices the layout does.
  const isMobile = useMediaQuery('(max-width: 767px)')

  /*
   * Section 8 — the peak particle budget for this device: 300 on mobile against
   * the spec's 1200 desktop peak. Every chapter's count is scaled against it,
   * so the spec's rise and fall survives on a phone instead of flattening at a
   * ceiling.
   */
  const particleCap = isMobile ? SCENE.particlesMobilePeak : PEAK_PARTICLES

  /*
   * Chapter 04's camera visits one station per published project — spec
   * section 4, and section 9's rule that nothing in the timeline hard-codes a
   * count. Three today; a fourth publish adds a station with no code change.
   *
   * `useProjects` rather than `useFeaturedProjects`: the latter takes a limit
   * and the homepage passes 3, which would cap the chapter forever.
   */
  const { data: projects } = useProjects()
  const projectCount = projects?.length ?? 1

  /*
   * The scene's state, shared by ref rather than by React state.
   *
   * It changes every frame. Routing that through a re-render would mean sixty
   * React renders a second for a value no component displays — the render loop
   * is the consumer, so the render loop is where it belongs.
   */
  const motionRef = useRef<MotionState | null>(null)

  return (
    <Canvas
      /*
       * dpr is capped rather than left at the device's native ratio. A modern
       * phone reports 3, which means rendering nine times the pixels of a 1x
       * buffer for a decorative background — the fastest way to turn a
       * scrolling page into a slideshow. Section 8 caps it at 1.5 there and 2
       * on desktop.
       */
      dpr={isMobile ? SCENE.dprMobile : SCENE.dprDesktop}
      camera={{
        position: [...SCENE.cameraStart],
        fov: SCENE.fov,
        near: SCENE.near,
        far: SCENE.far,
      }}
      /*
       * Under reduced motion the render loop does not run continuously:
       * "demand" draws only when something invalidates it, which ScrollDirector
       * does on a chapter change. Leaving it on "always" would keep a GPU busy
       * sixty times a second producing an identical image.
       */
      frameloop={reducedMotion ? 'demand' : 'always'}
      /*
       * The page owns the background colour. A transparent canvas lets the CSS
       * ambient-field show through underneath, so the two layers compose
       * instead of the canvas painting over the design system.
       */
      gl={{ alpha: true, antialias: !isMobile, powerPreference: 'high-performance' }}
      /*
       * Belt and braces. SceneContainer is already aria-hidden and
       * pointer-events-none, but that lives one level up and a refactor could
       * move it. Verified in the DOM: these land on the wrapper element React
       * Three Fiber puts around the canvas, not on the canvas itself, which is
       * near enough — the canvas is a descendant either way, so it stays out of
       * the accessibility tree and out of the tab order even if the outer
       * container changes.
       */
      aria-hidden="true"
      tabIndex={-1}
      style={{ pointerEvents: 'none' }}
    >
      {/*
       * Low ambient plus one key light. The Core is emissive and largely lights
       * itself; these exist so the wireframe shell and the sphere's silhouette
       * do not read as flat, not to illuminate the scene.
       */}
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 4, 6]} intensity={40} color={SCENE.coreWire} distance={30} />

      <ScrollDirector
        motionRef={motionRef}
        reducedMotion={reducedMotion}
        isMobile={isMobile}
        projectCount={projectCount}
        particleCap={particleCap}
      />
      <AICore animate={!reducedMotion} motionRef={motionRef} />
      <ParticleField capacity={particleCap} motionRef={motionRef} />
    </Canvas>
  )
}
