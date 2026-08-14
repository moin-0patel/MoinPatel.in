import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorState } from '@/components/common/States'

/**
 * Error boundary — PRD 38 ("Unexpected React error" → /500) and the per-section
 * boundary rule in Section 12.
 *
 * Class component because React has no hook equivalent: `componentDidCatch` is
 * the only way to catch a render-phase throw.
 *
 * Used at two scopes:
 *   - around each homepage section, so one failing section renders its own
 *     error state and never blanks the page (Section 12, global rules)
 *   - around each route, as the /500 backstop
 */

type Props = {
  children: ReactNode
  /** Rendered instead of the default. Receives a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Logged with the error, so "which section broke" is answerable. */
  context?: string
}

type State = { error: Error | null }

export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack is the useful half — it names the component that
    // threw. A real error reporter replaces this in P2 (PRD 38).
    console.error(
      `[boundary${this.props.context ? `: ${this.props.context}` : ''}]`,
      error,
      info.componentStack,
    )
  }

  private readonly reset = () => this.setState({ error: null })

  override render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <ErrorState
        title="Something went wrong"
        description="This part of the page failed to render. The rest of the page is unaffected."
        onRetry={this.reset}
      />
    )
  }
}
