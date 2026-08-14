import { AppError, reportError } from '@/lib/errors'
import { supabase } from '@/lib/supabaseClient'
import type { ContactFormValues } from '@/types/forms'

/**
 * Contact service — PRD 18, FR-CONT-01/08, TD-11.
 *
 * The insert path is intentionally minimal. Everything that decides whether a
 * submission is legitimate happens in the database:
 *
 *   hash_client_ip()             derives ip_hash, forces status/timestamps
 *   enforce_contact_rate_limit() 3s timing check, 5/hour, 20/day
 *   CHECK constraints            length and format bounds
 *   RLS with check               pins the columns a submitter may not set
 *
 * A client-side throttle would be decorative: the endpoint is reachable with
 * the publishable key by anyone who opens the network tab.
 */

export type ContactSubmission = ContactFormValues & {
  /** Path the form was submitted from, for triage context (23.14). */
  sourcePage: string
  /** When the form was rendered. The trigger uses it once for the FR-CONT-08
   *  timing check and then nulls it — it is never retained. */
  formRenderedAt: Date
}

export async function submitContactMessage(submission: ContactSubmission): Promise<void> {
  const context = 'contact.submitContactMessage'

  // The honeypot is checked here as well as by the schema so a bypassed client
  // validation still cannot reach the database (FR-CONT-08, AC-CONT-7).
  if (submission.website) {
    throw new AppError('validation', context, {
      userMessage: 'Your message could not be sent.',
    })
  }

  try {
    const { error } = await supabase.from('contact_messages').insert({
      name: submission.name,
      email: submission.email,
      company: submission.company?.trim() || null,
      subject: submission.subject,
      message: submission.message,
      service_type: submission.serviceType,
      source_page: submission.sourcePage.slice(0, 200),
      form_rendered_at: submission.formRenderedAt.toISOString(),
      // status, ip_hash, user_agent_family and the timestamps are all
      // server-owned. They are omitted rather than sent as nulls, which is
      // what the RLS `with check` requires (25.1).
    })
    // No `.select()`: with no SELECT policy for anon the read-back would fail,
    // and the client has no reason to see the stored row (25.1 note).

    if (error) throw error
  } catch (cause) {
    throw reportError(cause, context)
  }
}

/**
 * FR-CONT-07 — a `mailto:` fallback preserving what the visitor typed, offered
 * when the insert fails so a broken form never costs an enquiry.
 */
export function buildMailtoFallback(
  to: string,
  submission: Pick<ContactFormValues, 'name' | 'subject' | 'message' | 'company'>,
): string {
  const body = [
    submission.message,
    '',
    '—',
    submission.name,
    submission.company?.trim() ? submission.company.trim() : null,
  ]
    .filter((line) => line !== null)
    .join('\n')

  const params = new URLSearchParams({ subject: submission.subject, body })
  return `mailto:${to}?${params.toString()}`
}
