import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

import { supportsWebGL } from '@/lib/webgl'

/**
 * SceneContainer — the layer the 3D scene occupies.
 *
 * Phase 1 established the hard half of the integration, and none of it changed
 * when the Canvas arrived:
 *
 *   - the stacking context and z-order against the chapters
 *   - a fixed, viewport-sized layer that does not join the scroll
 *   - pointer-events: none, so the canvas never eats a click meant for a link
 *   - aria-hidden, because spec section 22 requires every meaningful thing to
 *     exist as HTML outside the canvas
 *
 * Phase 2 adds the scene inside it, behind three independent gates. All three
 * fail to the same place: the CSS ambient-field, which is the design the site
 * shipped with and is complete on its own. Nothing on this page depends on
 * WebGL working, and that is the property worth protecting — the 3D layer is
 * decoration over a working document, not the document.
 *
 * THIS FILE MUST NEVER STATICALLY IMPORT THE SCENE. It is reachable from the
 * homepage's entry graph, so a static import would pull three.js into the
 * shared shell and put it on every route including /resume. The dynamic import
 * below is load-bearing, not stylistic, and verify:ui's shared-shell budget is
 * what proves it is still working.
 */
const Scene = lazy(() => import('@/components/three/Scene'))

/**
 * A WebGL context can be lost at runtime — a driver reset, a GPU process crash,
 * or simply too many contexts on one page. React Three Fiber surfaces that as a
 * render error, and an unhandled one would unmount the whole homepage.
 *
 * Its own boundary rather than the app-level one: losing a decorative
 * background should cost the background, not the page. Once it fails it stays
 * failed, because a scene that repeatedly crashes and remounts is worse than
 * one that is quietly absent.
 */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}

export function SceneContainer() {
  /*
   * Gate 1 — mount only on the client, after paint.
   *
   * Starting false and flipping in an effect is normally a layout-shift smell,
   * but here it is the point: the scene must not be part of the first paint. It
   * has no layout of its own (the container is fixed and already sized), so
   * nothing moves when it appears, and the text is on screen and readable
   * before a single byte of three.js is requested.
   */
  const [ready, setReady] = useState(false)

  /*
   * Gate 2 — WebGL support, checked before the import is issued rather than
   * after. See lib/webgl.ts: discovering unsupported hardware by downloading
   * the renderer is the one outcome worth designing against.
   */
  const [canRender, setCanRender] = useState(false)

  useEffect(() => {
    setCanRender(supportsWebGL())
    setReady(true)
  }, [])

  return (
    <div
      aria-hidden="true"
      /*
       * -z-10 puts it behind content while staying in the same stacking
       * context. It is bounded to the FIRST VIEWPORT and masked out below it,
       * which is a consequence of the palette inversion rather than a style
       * choice: the page ground is now cream (#d5cfbe) with black body text,
       * and the scene renders dark. Black on the scene measured 1.18-2.25:1
       * against a 4.5:1 requirement across every chapter — 37 failures.
       *
       * No colour retune fixes that. For black text to clear 4.5:1 the scene
       * would have to be LIGHTER than the cream behind it, at which point it
       * is invisible. The reference resolves the same tension by having no 3D
       * behind its content at all, so the scene now lives where the reference
       * puts its visual interest — the opening viewport — and fades out before
       * the first body copy. All 3D infrastructure, chapters and motion are
       * untouched.
       */
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen [mask-image:linear-gradient(to_bottom,#000_0%,#000_62%,transparent_92%)]"
    >
      <div className="ambient-field" />

      {ready && canRender && (
        <SceneBoundary>
          {/*
           * Gate 3 — a null fallback. The scene has no loading state because it
           * has nothing to say while loading: the page is already complete
           * without it. A spinner here would advertise that something is
           * missing from a page that is not missing anything.
           */}
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </SceneBoundary>
      )}
    </div>
  )
}
