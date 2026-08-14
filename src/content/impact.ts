/**
 * "Impact / Business Value" — PRD 12.5, TD-12.
 *
 * ⚠ FR-HOME-05a (P0): this section must NEVER display a numeric metric — no
 * percentage, no currency figure, no hours saved — unless the value is stored
 * in the database, approved by Moin, and attributable to a measured project
 * outcome. Placeholder and illustrative numbers are prohibited.
 *
 * R-06 rates fabricated metrics as the single easiest mistake to make on this
 * project, and severe when made: invented numbers destroy credibility with
 * exactly the audience that matters. So these are the six approved qualitative
 * outcomes from 12.5, each with one supporting clause, and nothing more.
 *
 * These render as icon + statement rows — deliberately NOT "stat counters",
 * which are a shape that invites a number to be put in them later.
 */

export type OutcomeStatement = {
  statement: string
  supporting: string
  iconKey: string
}

export const IMPACT_OUTCOMES: readonly OutcomeStatement[] = [
  {
    statement: 'Reduce manual work',
    supporting: 'Steps a person repeats every day become steps the system handles.',
    iconKey: 'hand',
  },
  {
    statement: 'Reduce hours spent on repetitive processes',
    supporting: 'Time goes back to the work that needs judgement.',
    iconKey: 'clock',
  },
  {
    statement: 'Save operational cost',
    supporting: 'Less rework, fewer hand-offs, less time spent reconciling.',
    iconKey: 'trending-down',
  },
  {
    statement: 'Improve accuracy',
    supporting: 'Validation runs before data is accepted, not after someone notices.',
    iconKey: 'check',
  },
  {
    statement: 'Digitise manual workflows',
    supporting: 'Processes that lived on paper and in spreadsheets get a system.',
    iconKey: 'workflow',
  },
  {
    statement: 'Turn operational data into useful information',
    supporting: 'Records that were only stored become records that can be read.',
    iconKey: 'chart',
  },
] as const
