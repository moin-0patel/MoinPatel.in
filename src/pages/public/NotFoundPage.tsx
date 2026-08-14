import { Link } from 'react-router-dom'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'

/**
 * 404 — PRD FR-NAV-08, FR-CASE-01, 38.
 *
 * This page is also what an unknown OR unpublished project slug renders. The
 * two must be indistinguishable: a different response for a draft slug would
 * confirm that a draft with that name exists, which is the enumeration signal
 * SEC-11 and AC-PROJ-8 prohibit. So the copy says "isn't available", not
 * "doesn't exist".
 *
 * FR-NAV-08 requires both a link home and a link to /projects — a visitor who
 * landed on a dead project link is most likely looking for a different one.
 */
export default function NotFoundPage() {
  return (
    <>
      <SEO title="Not found · Moin Patel" noindex />
      <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
        <p className="text-muted font-mono text-sm tracking-[--tracking-mono]">404</p>
        <h1 className="text-primary mt-4 text-4xl">This page isn&rsquo;t available</h1>
        <p className="text-secondary measure mt-4">
          The link may be out of date, or the page may have been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Go to the homepage</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/projects">Browse projects</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
