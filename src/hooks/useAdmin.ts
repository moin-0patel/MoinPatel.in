import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

import { publicKeysFor, queryKeys } from '@/lib/queryKeys'
import {
  deleteMessage,
  deleteProject,
  getDashboardCounts,
  listAllProjects,
  listMessages,
  setMessageStatus,
  setProjectPublicationState,
  type DashboardCounts,
} from '@/services/admin.service'
import type {
  AdminProjectRow,
  ContactMessage,
  MessageStatus,
  PublicationState,
} from '@/types/domain'

/**
 * Admin hooks — PRD FE-03, 31.4.
 *
 * Two defaults are inverted from the public side, deliberately:
 *
 *   staleTime: 0            an admin list is a working surface, and stale
 *                           content there is actively misleading — you cannot
 *                           tell whether your save took
 *   refetchOnWindowFocus    coming back to the tab should show reality
 *
 * Every mutation invalidates BOTH the admin key and the corresponding public
 * key (31.4). Skipping the public half is the bug that makes publishing look
 * broken: the row changes, the admin list updates, and the live site keeps
 * serving the old version from cache for the full five-minute staleTime.
 */

const ADMIN_QUERY_DEFAULTS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
} as const

export function useDashboardCounts(): UseQueryResult<DashboardCounts> {
  return useQuery({
    queryKey: queryKeys.dashboard.counts(),
    queryFn: getDashboardCounts,
    ...ADMIN_QUERY_DEFAULTS,
  })
}

export function useAdminProjects(): UseQueryResult<AdminProjectRow[]> {
  return useQuery({
    queryKey: queryKeys.projects.admin(),
    queryFn: listAllProjects,
    ...ADMIN_QUERY_DEFAULTS,
  })
}

export function useAdminMessages(status?: MessageStatus): UseQueryResult<ContactMessage[]> {
  return useQuery({
    queryKey: queryKeys.messages.list(status),
    queryFn: () => listMessages(status),
    ...ADMIN_QUERY_DEFAULTS,
  })
}

/** Invalidate the admin branch and every public key the change can affect. */
function useInvalidator(keys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient()
  return () => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: key })
  }
}

export function useSetProjectPublicationState() {
  const invalidate = useInvalidator(publicKeysFor.projects())
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: PublicationState }) =>
      setProjectPublicationState(id, state),
    onSuccess: invalidate,
  })
}

/**
 * FR-ADM-09 — no optimistic UI for destructive actions. A delete that appears
 * to succeed and then silently reappears on the next refetch is worse than a
 * half-second wait, so the list refetches after the mutation instead.
 */
export function useDeleteProject() {
  const invalidate = useInvalidator(publicKeysFor.projects())
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: invalidate,
  })
}

export function useSetMessageStatus() {
  const invalidate = useInvalidator([queryKeys.messages.all, queryKeys.dashboard.all])
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MessageStatus }) =>
      setMessageStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteMessage() {
  const invalidate = useInvalidator([queryKeys.messages.all, queryKeys.dashboard.all])
  return useMutation({
    mutationFn: (id: string) => deleteMessage(id),
    onSuccess: invalidate,
  })
}
