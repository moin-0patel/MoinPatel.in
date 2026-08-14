import { cn } from './cn'

/**
 * Shared form-control styling and ARIA wiring.
 *
 * Split out of Field.tsx so that file exports only components, which keeps
 * Fast Refresh working on it during development.
 */

/** PRD 32.4 — the one control surface, used by every input, textarea and select. */
export const controlClass = cn(
  'bg-surface border-subtle text-primary w-full rounded-[--radius-sm] border',
  // RES-07 — 44px minimum touch target on every control.
  'min-h-11 px-3 py-2 text-sm',
  'transition-colors duration-[--duration-hover] ease-[--ease-out]',
  'focus:border-accent',
  'aria-[invalid=true]:border-danger',
  'disabled:cursor-not-allowed disabled:opacity-45',
  'placeholder:text-muted',
)

/**
 * Build the `aria-describedby` value for a control.
 *
 * A hint and an error can both apply, and passing only one of them silently
 * drops the other from the announcement — which is exactly the bug this helper
 * exists to prevent. When an error is present it supersedes the hint: reading
 * both would bury the actionable half.
 */
export function describedBy(id: string, hasError: boolean, hasHint: boolean): string | undefined {
  const ids = [hasError && `${id}-error`, hasHint && !hasError && `${id}-hint`].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}
