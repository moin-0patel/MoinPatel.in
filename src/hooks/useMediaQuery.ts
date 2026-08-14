import { useSyncExternalStore } from 'react'

/**
 * Subscribe to a media query.
 *
 * `useSyncExternalStore` rather than useState + useEffect: it reads the value
 * during render, so the first paint is already correct. The effect version
 * renders once with a guessed value and then corrects itself, which is a
 * layout shift (PERF-03).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // Server/prerender snapshot. False is the conservative answer: it assumes
    // the smaller layout and no motion preference override.
    () => false,
  )
}

/**
 * A11Y-10 / 32.5. Every animated component checks this and renders its final
 * state when true. The CSS in globals.css covers transitions declaratively;
 * this is for motion that only JavaScript can decide — the hero load sequence,
 * the process-line draw, smooth-scroll behaviour.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** 33.1 breakpoints, as hooks, for the cases CSS cannot express. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px)')
