import { useMutation, type UseMutationResult } from '@tanstack/react-query'

import { submitContactMessage, type ContactSubmission } from '@/services/contact.service'

/**
 * Contact submission — PRD FE-03.
 *
 * `retry: false` is inherited from the mutation defaults and matters here
 * specifically: an automatic retry on a request that actually succeeded but
 * whose response was lost would create a duplicate message in the inbox, and
 * would also count twice against the FR-CONT-08 rate limit — pushing a
 * legitimate sender toward the block.
 */
export function useContactForm(): UseMutationResult<void, Error, ContactSubmission> {
  return useMutation({
    mutationFn: submitContactMessage,
  })
}
