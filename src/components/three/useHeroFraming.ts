import { useEffect, useState } from 'react'

import { SCENE } from '@/components/three/sceneConstants'

export type HeroFraming = {
  /** Camera X in world units that places the Core over the portrait. */
  cameraX: number
  /** Camera Y in world units. */
  cameraY: number
  /** Core scale that makes the silhouette halo the portrait. */
  scale: number
}

/**
 * The Phase 3 hero framing, as a value rather than a side effect.
 *
 * Phase 3 had this component write straight to the camera on mount. Phase 4
 * cannot work that way: the camera is now driven every frame by the scroll
 * timeline, so a second writer would fight it and the last one to run each
 * frame would win — the classic two-systems-one-transform bug, which shows up
 * as a camera that jitters only while scrolling.
 *
 * So the measurement is separated from the application. This reports where the
 * hero wants the camera; ScrollDirector decides how much of that to honour,
 * blending it out across chapter 01 so the spec's centred path takes over by
 * chapter 02. Nothing about the framing maths changed — only who applies it.
 *
 * Returns null when there is no portrait to anchor to, which is every route
 * except the homepage.
 */
export function useHeroFraming(viewport: { width: number; height: number }): HeroFraming | null {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  useEffect(() => {
    const read = () => {
      const el = document.querySelector<HTMLElement>('[data-hero-anchor]')
      setAnchor(el ? el.getBoundingClientRect() : null)
    }
    read()

    const el = document.querySelector<HTMLElement>('[data-hero-anchor]')
    const observer = el ? new ResizeObserver(read) : null
    if (el && observer) observer.observe(el)
    window.addEventListener('resize', read)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', read)
    }
  }, [])

  if (!anchor || viewport.width === 0 || viewport.height === 0) return null

  const distance = SCENE.cameraStart[2]
  const visibleHeight = 2 * distance * Math.tan((SCENE.fov * Math.PI) / 360)
  const visibleWidth = visibleHeight * (viewport.width / viewport.height)

  const radiusPx = (Math.max(anchor.width, anchor.height) / 2) * SCENE.heroHaloRatio
  const outerPx = radiusPx * SCENE.wireShellScale

  /*
   * Keep the whole object on screen — the Phase 3 containment clamp, unchanged.
   * It only bites when the silhouette would actually overflow, so at 1440 and
   * above the anchor centre passes through untouched.
   */
  const clampAxis = (centrePx: number, extentPx: number) => {
    const min = outerPx + SCENE.heroEdgeMarginPx
    const max = extentPx - outerPx - SCENE.heroEdgeMarginPx
    if (min > max) return extentPx / 2
    return Math.min(max, Math.max(min, centrePx))
  }

  const cx = clampAxis(anchor.left + anchor.width / 2, viewport.width) / viewport.width
  const cy = clampAxis(anchor.top + anchor.height / 2, viewport.height) / viewport.height

  return {
    cameraX: (0.5 - cx) * visibleWidth,
    cameraY: (cy - 0.5) * visibleHeight,
    scale: Math.max(1, radiusPx / (viewport.height / visibleHeight)),
  }
}
