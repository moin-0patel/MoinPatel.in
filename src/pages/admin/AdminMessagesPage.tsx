import { Reply, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdminMessages, useDeleteMessage, useSetMessageStatus } from '@/hooks/useAdmin'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import { formatFullDate } from '@/lib/dates'
import { SERVICE_TYPE_LABELS } from '@/types/forms'
import type { ContactMessage, MessageStatus } from '@/types/domain'

/**
 * Messages inbox — PRD J-05, 20.2, AC-CONT-9.
 *
 * A triage inbox, not a CRM (NG-02). Four states, a mailto reply, and delete.
 * No pipeline, no deal stages, no assignment.
 */

const FILTERS: { value: MessageStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
  { value: 'spam', label: 'Spam' },
]

const STATUS_TONE = {
  new: 'accent',
  read: 'neutral',
  replied: 'success',
  archived: 'outline',
  spam: 'danger',
} as const

export default function AdminMessagesPage() {
  const [filter, setFilter] = useState<MessageStatus | 'all'>('all')
  const {
    data: messages,
    isPending,
    isError,
    error,
    refetch,
  } = useAdminMessages(filter === 'all' ? undefined : filter)

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-primary text-2xl">Messages</h1>
      <p className="text-secondary mt-1 text-sm">
        Enquiries from the contact form. Opening one marks it read.
      </p>

      <div role="group" aria-label="Filter by status" className="mt-6 flex flex-wrap gap-1.5">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              'h-11 rounded-(--radius-sm) border px-3 text-sm md:h-9',
              filter === option.value
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-subtle text-secondary hover:border-strong',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isPending ? (
          <div className="space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-(--radius-lg)" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : messages.length === 0 ? (
          <EmptyState
            title={filter === 'all' ? 'No messages yet' : 'Nothing in this state'}
            description={
              filter === 'all'
                ? 'Enquiries from the contact form land here.'
                : 'Try a different filter.'
            }
          />
        ) : (
          <ul className="space-y-2">
            {messages.map((message) => (
              <li key={message.id}>
                <MessageCard message={message} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MessageCard({ message }: { message: ContactMessage }) {
  const toast = useToast()
  const setStatus = useSetMessageStatus()
  const deleteMessage = useDeleteMessage()
  const [expanded, setExpanded] = useState(false)

  /*
   * J-05 — opening a message auto-marks it read.
   *
   * In an effect rather than in the click handler so it also fires if the card
   * is expanded some other way later, and guarded on `status === 'new'` so
   * re-opening a replied message does not knock it back to read.
   */
  useEffect(() => {
    if (expanded && message.status === 'new') {
      setStatus.mutate({ id: message.id, status: 'read' })
    }
    // Intentionally keyed on expansion and the current status only.
  }, [expanded, message.status, message.id, setStatus])

  const mailtoHref = `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`

  const changeStatus = (status: MessageStatus, label: string) => {
    setStatus.mutate(
      { id: message.id, status },
      {
        onSuccess: () => toast.success(label, message.subject),
        onError: (cause) => toast.error("Couldn't update the message", cause),
      },
    )
  }

  return (
    <article
      className={cn(
        'rounded-(--radius-lg) border p-4',
        message.status === 'new'
          ? 'border-accent/30 bg-accent-soft/30'
          : 'border-subtle bg-surface',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-primary truncate font-medium">{message.subject}</h2>
            <Badge tone={STATUS_TONE[message.status]}>{message.status}</Badge>
          </div>
          <p className="text-secondary mt-1 truncate text-sm">
            {message.name}
            {message.company ? ` · ${message.company}` : ''} · {message.email}
          </p>
          <p className="text-muted mt-1 font-mono text-xs">
            {formatFullDate(message.createdAt)} · {SERVICE_TYPE_LABELS[message.serviceType]}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="text-accent hover:text-accent-strong mt-3 text-sm font-medium"
      >
        {expanded ? 'Hide message' : 'Read message'}
      </button>

      {expanded && (
        <>
          {/* Plain text, deliberately. A contact message is untrusted input and
              is never rendered as markdown or HTML (SEC-05). */}
          <p className="text-secondary measure mt-3 text-sm whitespace-pre-wrap">
            {message.message}
          </p>

          <div className="border-subtle mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
            <Button variant="secondary" size="sm" asChild>
              <a href={mailtoHref}>
                <Reply className="size-3.5" aria-hidden="true" />
                Reply by email
              </a>
            </Button>

            {message.status !== 'replied' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeStatus('replied', 'Marked replied')}
              >
                Mark replied
              </Button>
            )}
            {message.status !== 'archived' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeStatus('archived', 'Archived')}
              >
                Archive
              </Button>
            )}
            {message.status !== 'spam' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeStatus('spam', 'Marked as spam')}
              >
                Spam
              </Button>
            )}

            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  aria-label={`Delete message: ${message.subject}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
              }
              title="Delete this message?"
              recordName={`${message.subject} — ${message.name}`}
              description="The message is permanently removed. Archiving keeps it out of the way without losing it."
              onConfirm={() =>
                new Promise<void>((resolve) => {
                  deleteMessage.mutate(message.id, {
                    onSuccess: () => {
                      toast.success('Message deleted')
                      resolve()
                    },
                    onError: (cause) => {
                      toast.error("Couldn't delete the message", cause)
                      resolve()
                    },
                  })
                })
              }
            />
          </div>
        </>
      )}
    </article>
  )
}
