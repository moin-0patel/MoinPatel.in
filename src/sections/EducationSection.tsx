import { Section, SectionHeading } from '@/components/common/Section'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { useEducation } from '@/hooks/useSiteContent'
import { formatEducationStatus, toDateTimeAttr } from '@/lib/dates'

/**
 * Education — PRD 12.9 and 17.
 *
 * Completes the recruiter checklist and nothing more.
 *
 * FR-EDU-04: a grade renders only when it is populated AND `show_grade` is
 * true. The service already applies that gate in its mapper, so `gradeLabel`
 * arriving non-null here means it has been cleared for display — this
 * component cannot leak one by forgetting a check.
 *
 * Currently only the B.Com. record renders: Class X and XII are seeded as
 * drafts pending Q-18, and their institution names are still unknown.
 */
export function EducationSection() {
  const { data: education, isPending, isError } = useEducation()

  if (isPending) {
    return (
      <Section id="education" labelledBy="education-heading">
        <SectionHeading
          id="education-heading"
          eyebrow="Education"
          meta="CREDENTIALS"
          title="Education"
        />
        <Skeleton className="h-28 w-full max-w-md rounded-[--radius-lg]" />
      </Section>
    )
  }

  // 12.9 — the section is hidden when empty. Education is a supporting detail;
  // an error here should not put a red box on the homepage, so a failure is
  // treated the same as "nothing to show".
  if (isError || education.length === 0) return null

  return (
    <Section id="education" labelledBy="education-heading">
      <SectionHeading
        id="education-heading"
        eyebrow="Education"
        meta="CREDENTIALS"
        title="Education"
      />

      <ul className="grid gap-4 lg:grid-cols-2">
        {education.map((record) => (
          <li key={record.id}>
            <article className="rim-light border-subtle bg-surface hover:border-accent/40 transition-colors duration-[--duration-hover] ease-[--ease-out] h-full rounded-[--radius-lg] border p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-primary text-lg">{record.qualification}</h3>
                {/* FR-EDU-03 / AC-EDU-2 — "Expected 2027" is rendered as
                    explicit text, never implied by a bare future date. */}
                <Badge tone={record.status === 'completed' ? 'neutral' : 'accent'}>
                  <time dateTime={toDateTimeAttr(record.endDate)}>
                    {formatEducationStatus(record.status, record.endDate)}
                  </time>
                </Badge>
              </div>

              <p className="text-secondary mt-1 text-sm">{record.institution}</p>

              {record.fieldOfStudy && (
                <p className="text-muted mt-1 text-sm">{record.fieldOfStudy}</p>
              )}

              {/* Non-null only because show_grade is true (FR-EDU-04). */}
              {record.gradeLabel && (
                <p className="text-muted mt-2 font-mono text-xs">{record.gradeLabel}</p>
              )}

              {record.description && (
                <p className="text-secondary mt-3 text-sm">{record.description}</p>
              )}
            </article>
          </li>
        ))}
      </ul>
    </Section>
  )
}
