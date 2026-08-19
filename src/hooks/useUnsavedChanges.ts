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
 *
 * REQUIRES A DATA ROUTER — AND THAT IS NOT A DETAIL
 *
 * `useBlocker` does not degrade when it is used outside a data router. It
 * throws:
 *
 *   Error: useBlocker must be used within a data router.
 *
 * The app was originally built on `<BrowserRouter>` with `<Routes>`, so this
 * hook took every screen that called it straight to the 500 error boundary.
 * `/admin/projects/new` failed every time; `/admin/settings` failed as soon as
 * its profile query resolved and the hook ran, which made it look
 * intermittent. Both were completely unusable.
 *
 * Nothing caught it. The browser harness does not cover admin routes — they
 * need a signed-in session — and a router-context requirement is invisible to
 * tsc, to ESLint and to a production build. It was found only by driving the
 * real admin UI in a browser.
 *
 * App.tsx now uses `createBrowserRouter` + `RouterProvider` specifically so
 * this works. If anyone reverts that, these two screens break again.
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
