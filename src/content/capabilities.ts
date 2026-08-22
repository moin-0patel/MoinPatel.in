import type { ProjectCategory } from '@/types/domain'

/**
 * Chapter 03 — Capabilities, spec §9.
 *
 * The spec names four areas (AI, AUTOMATION, DATA, SYSTEMS) and lists example
 * items under each. Those lists are the spec's illustrations, not a claim about
 * what Moin has shipped, so every entry here was checked against the three real
 * projects and the skills in the database before it was written down.
 *
 * WHAT WAS DROPPED, AND WHY
 *
 * The spec suggests RAG, AI agents, PostgreSQL and "data pipelines". None of
 * those appear in the verified work: the AI surface is Gemini extraction over
 * scanned documents, the databases are Supabase Postgres and Google Sheets, and
 * there is no agent or retrieval system. Listing them would be a capability
 * claim nobody could back up in an interview, which PRD Principle 4 exists to
 * prevent. The four area NAMES are the spec's; the items under them are the
 * work's.
 *
 * Static rather than CMS-backed, matching build-types.ts and impact.ts: this is
 * positioning that changes when the practice changes, not editorial copy.
 *
 * `category` links each area to the project filter, so a reader can go from a
 * capability straight to the systems that demonstrate it.
 */

export type Capability = {
  /** Spec §9 names these four. */
  title: string
  /** Mono label in the design's chapter language. */
  eyebrow: string
  description: string
  items: readonly string[]
  /** Filters /projects. Null when no single category maps cleanly. */
  category: ProjectCategory | null
}

export const CAPABILITIES: readonly Capability[] = [
  {
    title: 'AI',
    eyebrow: 'EXTRACTION',
    description:
      'Reading what was written by hand or buried in a document, and turning it into fields a system can use.',
    items: [
      'Handwriting and document extraction',
      'Schema-constrained model output',
      'Sentiment and classification tagging',
      'Validation before anything is trusted',
    ],
    category: 'ai_automation',
  },
  {
    title: 'Automation',
    eyebrow: 'PIPELINES',
    description:
      'Work that used to need a person on a schedule, running unattended and reporting on itself.',
    items: [
      'Scheduled, unattended pipelines',
      'Deduplication and idempotent re-runs',
      'Health checks and digest reporting',
      'Third-party platform integration',
    ],
    category: 'business_process_automation',
  },
  {
    title: 'Data',
    eyebrow: 'STRUCTURE',
    description:
      'Modelling the domain so the questions worth asking are answerable later, not just today.',
    items: [
      'Postgres schema and row-level security',
      'Answer-level and event-level capture',
      'Cost and dependency cascades',
      'Reporting surfaces over live data',
    ],
    category: 'data_reporting',
  },
  {
    title: 'Systems',
    eyebrow: 'PRODUCTION',
    description:
      'Full applications people use daily — access control, workflows and the unglamorous parts that decide whether it survives.',
    items: [
      'React and TypeScript applications',
      'Supabase auth, storage and RLS',
      'Role and scope based permissions',
      'Approval workflows and audit trails',
    ],
    category: 'web_application',
  },
]
