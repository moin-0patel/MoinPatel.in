/**
 * Can this browser actually run the scene?
 *
 * Asked BEFORE the 3D bundle is imported, and that ordering is the whole point.
 * Mounting a Canvas on a device without WebGL means downloading ~450 KB to
 * discover it cannot be used — the worst outcome available, since the visitors
 * most likely to lack WebGL are the ones least able to afford the download.
 *
 * Deliberately in lib/ rather than components/three/: this module must stay
 * free of any three.js import so it can live in the shared shell without
 * dragging the scene in behind it.
 *
 * The context is created and then immediately released. A probe context that is
 * kept alive counts against the browser's small per-page WebGL context limit,
 * and the real Canvas would then fail to get one — a self-inflicted failure that
 * looks exactly like the condition being tested for.
 */
export function supportsWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')

    if (!context) return false

    // WEBGL_lose_context is the only reliable way to release a context
    // promptly; without it the browser holds it until GC, which may be long
    // after the real Canvas has already been refused one.
    const lose = (context as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()

    return true
  } catch {
    // Some privacy configurations throw rather than returning null. A thrown
    // probe is a negative answer, not an error worth reporting: the page has a
    // complete, correct fallback and nothing is broken.
    return false
  }
}
