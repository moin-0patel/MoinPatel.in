import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * FR-NAV-05 — a route change resets scroll to the top and moves focus to the
 * new page's <h1>.
 *
 * The focus half is the part that is usually missed. In a client-rendered SPA
 * nothing tells a screen reader that the page changed: the URL updates, the
 * DOM swaps, and focus stays wherever the activated link was — often on an
 * element that no longer exists. Moving focus to the heading announces the new
 * page and puts keyboard tabbing back at the start of the content.
 *
 * `tabIndex = -1` is set programmatically so the heading is focusable by
 * script but never lands in the tab order.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    // An in-page anchor (#featured-projects) is a deliberate scroll target;
    // hijacking it back to the top would break every jump link.
    if (hash) return

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

    const heading = document.querySelector<HTMLElement>('main h1')
    if (heading) {
      heading.setAttribute('tabindex', '-1')
      heading.focus({ preventScroll: true })
    }
  }, [pathname, hash])

  return null
}
