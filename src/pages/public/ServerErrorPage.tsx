import { Link } from 'react-router-dom'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'

/**
 * 500 — PRD 38, "Unexpected React error".
 *
 * The destination of the route-level error boundary. SEC-11: no stack trace,
 * no component name, no error message from the throw. The detail goes to the
 * console and, in P2, to the error reporter — the visitor gets two actions.
 */
export default function ServerErrorPage({ onReload }: { onReload?: () => void }) {
  return (
    <>
      <SEO title="Something went wrong · Moin Patel" noindex />
      <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center py-20 text-center">
        <p className="text-muted font-mono text-sm tracking-[--tracking-mono]">500</p>
        <h1 className="text-primary mt-4 text-4xl">Something went wrong</h1>
        <p className="text-secondary measure mt-4">
          An unexpected error stopped this page from loading. Reloading usually fixes it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={onReload ?? (() => window.location.reload())}>Reload the page</Button>
          <Button variant="secondary" asChild>
            <Link to="/">Go to the homepage</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
