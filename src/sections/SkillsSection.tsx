import { Section, SectionHeading } from '@/components/common/Section'
import { ErrorState } from '@/components/common/States'
import { Chip } from '@/components/ui/Chip'
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton'
import { useSkillGroups } from '@/hooks/useSiteContent'

/**
 * Skills — PRD 12.8 and 16.
 *
 * A keyword surface for recruiters and a capability surface for engineers.
 *
 * FR-HOME-08a / FR-SKILL-03 (P0): NO percentage bars, star ratings or numeric
 * proficiency indicators. Ordering and `is_core` are the only emphasis
 * mechanisms — and there is no proficiency column in the schema to render one
 * from even if a component wanted to. AC-SKILL-3 asserts that column's absence,
 * and `db:verify` checks it.
 */
export function SkillsSection() {
  const { data: groups, isPending, isError, error, refetch } = useSkillGroups()

  if (isPending) {
    return (
      <Section id="skills" labelledBy="skills-heading">
        <SectionHeading id="skills-heading" eyebrow="Skills" title="What I work with" />
        <LoadingRegion label="Loading skills" className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, column) => (
            <div key={column} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 6 }, (_, chip) => (
                  <Skeleton key={chip} className="h-7 w-20" />
                ))}
              </div>
            </div>
          ))}
        </LoadingRegion>
      </Section>
    )
  }

  if (isError) {
    return (
      <Section id="skills" labelledBy="skills-heading">
        <SectionHeading id="skills-heading" eyebrow="Skills" title="What I work with" />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </Section>
    )
  }

  // FR-SKILL-06 — the service already drops categories with no published
  // skills; this hides the section when nothing at all is published.
  if (groups.length === 0) return null

  return (
    <Section id="skills" labelledBy="skills-heading" className="bg-surface/30">
      <SectionHeading id="skills-heading" eyebrow="Skills" title="What I work with" />

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id}>
            <h3
              id={`skill-group-${group.slug}`}
              className="text-muted mb-3 font-mono text-xs tracking-[--tracking-mono] uppercase"
            >
              {group.name}
            </h3>
            {/* A11Y-01 — a labelled list per category, not a div soup. */}
            <ul aria-labelledby={`skill-group-${group.slug}`} className="flex flex-wrap gap-1.5">
              {group.skills.map((skill) => (
                <li key={skill.id}>
                  {/* `is_core` gives a subtly stronger chip. That is the whole
                      emphasis vocabulary — no bars, no ratings. */}
                  <Chip emphasis={skill.isCore ? 'core' : 'default'}>{skill.name}</Chip>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
