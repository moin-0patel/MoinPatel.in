/**
 * Typed application errors — PRD API-04.
 *
 * Services catch every Supabase error, log it with context, and re-throw as
 * one of these so hooks can map to a UI state without inspecting driver
 * internals. SEC-11 is the constraint that shapes the design: a user-facing
 * message must never leak schema details, SQL, stack traces, or whether a
 * given draft slug exists — so the raw cause is kept separate from `message`
 * and only ever reaches the console/reporter.
 */

export type AppErrorKind =
  /** Network unreachable, timeout, offline. Retry is meaningful. */
  | 'network'
  /** The database rejected the query. Generic message; details go to logs. */
  | 'query'
  /** Row does not exist, or exists but is not published. Deliberately the
   *  same kind for both — see PRD 38 and AC-PROJ-8. */
  | 'not_found'
  /** RLS or a grant refused the operation. */
  | 'forbidden'
  /** Contact form rate limit or timing check (FR-CONT-08). */
  | 'rate_limited'
  /** Input failed a database CHECK constraint. */
  | 'validation'
  /** Anything unclassified. */
  | 'unknown'

const USER_MESSAGE: Record<AppErrorKind, string> = {
  network: "Couldn't reach the server. Check your connection and try again.",
  query: "Couldn't load this section.",
  not_found: 'Not found.',
  forbidden: "You don't have permission to do that.",
  rate_limited: "You've sent several messages recently. Please email directly.",
  validation: 'Some of the details need fixing.',
  unknown: 'Something went wrong.',
}

export class AppError extends Error {
  override readonly name = 'AppError'
  readonly kind: AppErrorKind
  /** Safe to render. Never contains schema, SQL or stack detail (SEC-11). */
  readonly userMessage: string
  /** Where it happened, e.g. 'projects.listPublished'. Logged, never shown. */
  readonly context: string

  constructor(
    kind: AppErrorKind,
    context: string,
    options?: { cause?: unknown; userMessage?: string },
  ) {
    super(`[${kind}] ${context}`)
    this.kind = kind
    this.context = context
    this.userMessage = options?.userMessage ?? USER_MESSAGE[kind]
    if (options?.cause !== undefined) this.cause = options.cause
  }

  get isRetryable(): boolean {
    return this.kind === 'network' || this.kind === 'query'
  }
}

/** Narrow shape of a PostgREST error, without importing driver internals. */
type PostgrestLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

function isPostgrestLike(value: unknown): value is PostgrestLike {
  return typeof value === 'object' && value !== null && ('code' in value || 'message' in value)
}

/**
 * Classify a driver error into an AppError. Called from every service catch
 * block, so the mapping lives in exactly one place.
 */
export function toAppError(cause: unknown, context: string): AppError {
  if (cause instanceof AppError) return cause

  if (isPostgrestLike(cause)) {
    const code = cause.code ?? ''
    const hint = cause.hint ?? ''

    // Hints raised by enforce_contact_rate_limit() (see the trigger migration).
    if (hint === 'contact_rate_limited' || hint === 'contact_too_fast') {
      return new AppError('rate_limited', context, { cause })
    }

    switch (code) {
      // .single() matched no rows — a missing or unpublished row.
      case 'PGRST116':
        return new AppError('not_found', context, { cause })
      // RLS refused, or the role lacks the grant.
      case '42501':
      case 'PGRST301':
        return new AppError('forbidden', context, { cause })
      // CHECK constraint, not-null, unique.
      case '23514':
      case '23502':
      case '23505':
        return new AppError('validation', context, { cause })
      // Raised by our own triggers.
      case 'P0001':
        return new AppError('rate_limited', context, { cause })
      default:
        break
    }

    return new AppError('query', context, { cause })
  }

  if (cause instanceof TypeError && /fetch|network/i.test(cause.message)) {
    return new AppError('network', context, { cause })
  }

  return new AppError('unknown', context, { cause })
}

/**
 * Log with context, then return the AppError to throw. Keeping this separate
 * from `toAppError` means a service can classify without logging when it
 * intends to handle the error itself (e.g. mapping not_found to null).
 */
export function reportError(cause: unknown, context: string): AppError {
  const error = toAppError(cause, context)
  // Dev gets the full object; production gets the shape without the payload.
  // A real error reporter replaces this in P2 (PRD 38).
  console.error(`[${error.kind}] ${context}`, error.cause ?? error)
  return error
}
