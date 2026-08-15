import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Unsaved-changes guard — PRD FR-ADM-05.
 *
 * Persona 4 fails if "a form loses content on validation error", and losing a
 * half-written case study to a stray back-button press is the same wound.
 * Writing one takes real effort; R-12 already flags that the hard part of this
 * product is getting case studies written at all.
 *
 * Two separate mechanisms are needed, because they cover different exits:
 *
 *   useBlocker          in-app navigation (clicking a sidebar link). React
 *                       Router owns this; the browser knows nothing about it.
 *   beforeunload        leaving the site entirely — closing the tab, reload,
 *                       typing a new URL. The browser owns this and shows its
 *                       own generic dialog; the message cannot be customised.
 *
 * Implementing only the first is the common mistake: in-app navigation is
 * guarded, and then a reload silently discards everything.
 */
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!hasUnsavedChanges) return

    const handler = (event: BeforeUnloadEvent) => {
      // Required for the prompt to appear at all. The string is ignored by
      // every current browser — they show their own wording.
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  return {
    /** True while an in-app navigation is being held pending confirmation. */
    isBlocked: blocker.state === 'blocked',
    /** Discard the changes and continue to the destination. */
    proceed: () => blocker.proceed?.(),
    /** Stay on the page. */
    cancel: () => blocker.reset?.(),
  }
}
