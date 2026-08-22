/**
 * Scene constants — the motion spec's numbers, in one place.
 *
 * Separated from the components that use them so the values Phase 4 will tune
 * are readable without opening three files, and so this module can be imported
 * by something that is not a component without pulling React Three Fiber in.
 *
 * Colours are the verified palette from tokens.css, restated as literals rather
 * than read from CSS custom properties. WebGL needs a number, not a computed
 * style string, and resolving tokens at runtime would mean a layout read on
 * mount for a value that has never changed. The trade-off is that a palette
 * change has to be made in two places — noted here so the second place is
 * findable.
 *
 * Motion spec section 12 accepts that an emissive material reads bluer than its
 * hex suggests. That is fine: light is not text, and no contrast requirement
 * applies to it.
 */
export const SCENE = {
  /* --- camera: motion spec section 2, chapter 01 start state --------------- */
  fov: 45,
  near: 0.1,
  far: 100,
  /** Chapter 01 local 0. Phase 4 drives this along the path in section 5. */
  cameraStart: [0, 0, 8] as const,
  cameraTarget: [0, 0, 0] as const,

  /* --- the Core ----------------------------------------------------------- */
  coreBase: '#241f4d',
  coreEmissive: '#4f46e5',
  coreWire: '#c3c0ff',
  /** Chapter 01 local 0 — "clearly lit" on the spec's 0–3 scale. */
  emissiveRest: 1.0,
  /** Section 4, chapter 03: the closed-Core wireframe opacity. */
  wireOpacityRest: 0.15,

  /**
   * Motion spec section 3.2 — a constant 2 degrees/second on Y, independent of
   * scroll, so the scene never looks frozen when the reader stops. Stored in
   * radians because that is what three.js wants and converting on every frame
   * is arithmetic for nothing.
   */
  ambientSpinRadPerSecond: (2 * Math.PI) / 180,

  /**
   * How far the Core's silhouette extends past the hero portrait it frames.
   *
   * 1.0 would put the Core's edge exactly on the portrait's edge — invisible,
   * since the portrait is opaque and sits in front. 1.28 leaves a ring of Core
   * about a seventh of the portrait's width all the way round: enough to read
   * as light behind the person at every breakpoint, and not so much that the
   * sphere reaches the text column.
   *
   * Ratio rather than a fixed pixel halo, so the relationship holds from a
   * 160px portrait on a phone to a 420px one at 1280 — the two look like the
   * same composition at different sizes instead of two different designs.
   */
  heroHaloRatio: 1.28,

  /**
   * How far past its own silhouette the Core's emissive glow still lifts the
   * background enough to matter for text contrast.
   *
   * Used only by the clear-region search, never by anything that renders — the
   * Core is not made bigger, the constraint is simply told to give it a wider
   * berth. 1.35 was chosen against measurement: failures were clustering at
   * 3.96-4.46:1 on text clear of the geometry but inside the halo.
   */
  glowAvoidanceRatio: 1.35,

  /**
   * The wireframe shell's scale relative to the Core sphere.
   *
   * Lives here rather than inline in AICore because it defines the object's
   * OUTER silhouette, and CoreFraming has to know that number to keep the whole
   * object on screen. When it was a literal in the JSX, the framing maths used
   * the sphere's radius and the shell overflowed the right edge at 1280x900 by
   * 38px — the clamp was correct about a boundary that was not the real one.
   */
  wireShellScale: 1.16,

  /** Breathing room between the Core's outer silhouette and the viewport edge. */
  heroEdgeMarginPx: 8,

  /* --- particles: motion spec section 8 ------------------------------------ */
  particlesDesktop: 500,
  particlesMobile: 150,
  /** Section 8 — the mobile peak, against the spec's 1200 on desktop. */
  particlesMobilePeak: 300,
  particleColor: '#c3c0ff',
  particleSize: 0.02,
  /** Particles fill a shell between these radii — never inside the Core. */
  particleInnerRadius: 2.5,
  particleOuterRadius: 9,

  /* --- device caps: motion spec section 8 ---------------------------------- */
  dprDesktop: [1, 2] as [number, number],
  dprMobile: [1, 1.5] as [number, number],
} as const
