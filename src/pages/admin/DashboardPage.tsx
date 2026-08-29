import { AlertTriangle, FileText, FolderKanban, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorState } from '@/components/common/States'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDashboardCounts } from '@/hooks/useAdmin'
import { cn } from '@/lib/cn'

/**
 * Admin dashboard — PRD FR-ADM-10.
 *
 * Counts, and the two things worth acting on: unread messages and drafts.
 *
 * The "no published projects" notice is not decoration. R-11 rates launching
 * with an empty portfolio as high impact, and the current state — three
 * projects, all drafts, blocked on disclosure permission (Q-06/Q-07) — is
 * exactly that risk in progress. The dashboard should say so rather than
 * showing a tidy row of zeros.
 */
export default function DashboardPage() {
  const { data: counts, isPending, isError, error, refetch } = useDashboardCounts()

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-primary text-2xl">Dashboard</h1>
      <p className="text-secondary mt-1 text-sm">What needs attention.</p>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} className="mt-8" />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Published projects"
              value={counts?.publishedProjects}
              isPending={isPending}
              to="/admin/projects"
              icon={<FolderKanban className="size-4" aria-hidden="true" />}
            />
            <StatCard
              label="Drafts"
              value={counts?.draftProjects}
              isPending={isPending}
              to="/admin/projects"
              icon={<FileText className="size-4" aria-hidden="true" />}
              // A draft is work in progress, not a problem — highlighted only
              // when there is nothing published to balance it.
              tone={
                counts && counts.draftProjects > 0 && counts.publishedProjects === 0
                  ? 'warning'
                  : 'default'
              }
            />
            <StatCard
              label="Unread messages"
              value={counts?.unreadMessages}
              isPending={isPending}
              to="/admin/messages"
              icon={<Mail className="size-4" aria-hidden="true" />}
              tone={counts && counts.unreadMessages > 0 ? 'accent' : 'default'}
            />
            <StatCard
              label="Published resume"
              value={counts?.hasPublishedResume ? 1 : 0}
              displayValue={counts ? (counts.hasPublishedResume ? 'Yes' : 'None') : undefined}
              isPending={isPending}
              to="/admin/resume"
              icon={<FileText className="size-4" aria-hidden="true" />}
              tone={counts && !counts.hasPublishedResume ? 'warning' : 'default'}
            />
          </div>

          {/* R-11 — an empty portfolio is worse than no portfolio. */}
          {counts && counts.publishedProjects === 0 && (
            <div className="border-warning/30 bg-warning-soft mt-6 flex items-start gap-3 rounded-(--radius-md) border p-4">
              <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-primary text-sm font-medium">
                  No projects are published, so the public site has no work on it.
                </p>
                <p className="text-secondary mt-1 text-sm">
                  {counts.draftProjects > 0
                    ? `${counts.draftProjects} draft${counts.draftProjects === 1 ? ' is' : 's are'} waiting. They stay drafts until you have confirmed you may publish each one and name (or anonymise) the client.`
                    : 'Add a project to get started.'}
                </p>
                <Link
                  to="/admin/projects"
                  className="text-accent hover:text-accent-strong mt-2 inline-block text-sm font-medium"
                >
                  Review drafts
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <MiniStat
              label="Experience"
              value={counts?.publishedExperience}
              isPending={isPending}
            />
            <MiniStat label="Skills" value={counts?.publishedSkills} isPending={isPending} />
            <MiniStat label="Education" value={counts?.publishedEducation} isPending={isPending} />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  displayValue,
  isPending,
  to,
  icon,
  tone = 'default',
}: {
  label: string
  value: number | undefined
  displayValue?: string
  isPending: boolean
  to: string
  icon: React.ReactNode
  tone?: 'default' | 'accent' | 'warning'
}) {
  return (
    <Link
      to={to}
      className={cn(
        'block rounded-(--radius-lg) border p-4',
        'transition-colors duration-(--duration-hover) ease-(--ease-out)',
        tone === 'accent' && 'border-accent/30 bg-accent-soft',
        tone === 'warning' && 'border-warning/30 bg-warning-soft',
        tone === 'default' && 'border-subtle bg-surface hover:border-strong',
      )}
    >
      <div className="text-muted flex items-center gap-2">
        {icon}
        <span className="font-mono text-xs tracking-(--tracking-mono) uppercase">{label}</span>
      </div>
      {isPending ? (
        <Skeleton className="mt-3 h-9 w-12" />
      ) : (
        <p className="text-primary font-display mt-2 text-3xl font-semibold">
          {displayValue ?? value ?? 0}
        </p>
      )}
    </Link>
  )
}

function MiniStat({
  label,
  value,
  isPending,
}: {
  label: string
  value: number | undefined
  isPending: boolean
}) {
  return (
    <div className="border-subtle bg-surface rounded-(--radius-md) border p-3">
      <p className="text-muted font-mono text-xs tracking-(--tracking-mono) uppercase">{label}</p>
      {isPending ? (
        <Skeleton className="mt-2 h-6 w-8" />
      ) : (
        <p className="text-primary mt-1 text-lg font-semibold">{value ?? 0} published</p>
      )}
    </div>
  )
}
