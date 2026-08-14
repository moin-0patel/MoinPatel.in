import { QueryClient } from '@tanstack/react-query'

import { AppError } from './errors'

/**
 * TanStack Query defaults — PRD 31.4.
 *
 * Public content: staleTime 5 minutes (PERF-10) so scrolling the homepage
 * does not trigger refetch storms across eleven sections, and no refetch on
 * window focus — the content changes when Moin publishes, not when a visitor
 * alt-tabs.
 *
 * Admin lists override both (staleTime 0, refetchOnWindowFocus true) at the
 * hook level; those are working surfaces where stale data is misleading.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Retrying a 'not_found' or 'forbidden' just delays the correct UI.
          if (error instanceof AppError && !error.isRetryable) return false
          return failureCount < 1 // PRD 31.4: retry: 1
        },
      },
      mutations: {
        // A mutation that failed should surface, not silently repeat — a
        // retried contact-form insert could create a duplicate message.
        retry: false,
      },
    },
  })
}
