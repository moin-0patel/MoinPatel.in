import type { Enums, Tables } from './database.types'

/**
 * Domain types — the shapes the application actually reasons about.
 *
 * FE-02: services return these, never raw Supabase rows. Two reasons that
 * matters here. First, a raw row carries columns the public site must never
 * render (`confidentiality_note`, `client_name` when undisclosed), and the
 * type system should make that impossible rather than merely discouraged.
 * Second, a rename in the database becomes one edit in a mapper instead of a
 * find-and-replace across every component.
 */

export type PublicationState = Enums<'publication_state'>
export type ProjectStatus = Enums<'project_status'>
export type ProjectCategory = Enums<'project_category'>
export type VisibilityMode = Enums<'visibility_mode'>
export type ImageRole = Enums<'image_role'>
export type TechCategory = Enums<'tech_category'>
export type TechRole = Enums<'tech_role'>
export type EducationStatus = Enums<'education_status'>
export type MessageStatus = Enums<'message_status'>
export type ServiceType = Enums<'service_type'>

/* --- Technology ---------------------------------------------------------- */

export type Technology = {
  id: string
  name: string
  slug: string
  category: TechCategory
  iconKey: string | null
  colorHex: string | null
  websiteUrl: string | null
}

export type ProjectTechnology = Technology & {
  /** FR-CASE-05: the Technology block marks primary vs supporting. */
  role: TechRole
}

/* --- Project ------------------------------------------------------------- */

export type ProjectImage = {
  id: string
  storagePath: string
  /** Never optional. The database enforces it (A11Y-06, MED-03). */
  altText: string
  caption: string | null
  role: ImageRole
  width: number | null
  height: number | null
}

export type PipelineStep = {
  id: string
  stepNumber: number
  label: string
  description: string | null
  techNote: string | null
  iconKey: string | null
}

/**
 * What a card needs, and nothing more. Note the absence of `clientName`,
 * `confidentialityNote` and every markdown body field — a card cannot leak
 * what it cannot hold.
 */
export type ProjectSummary = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string
  status: ProjectStatus
  category: ProjectCategory
  visibilityMode: VisibilityMode
  isFeatured: boolean
  startedOn: string | null
  completedOn: string | null
  coverImagePath: string | null
  coverImageAlt: string | null
  githubUrl: string | null
  liveUrl: string | null
  publishedAt: string | null
  updatedAt: string
  technologies: ProjectTechnology[]
}

/** The full case study. */
export type Project = ProjectSummary & {
  descriptionMd: string | null
  problemMd: string | null
  solutionMd: string | null
  howItWorksMd: string | null
  architectureMd: string | null
  businessImpactMd: string | null
  challengesMd: string | null
  lessonsMd: string | null
  roleDescription: string | null
  videoUrl: string | null
  /**
   * FR-PROJ-16: present only when `client_disclosed` is true. The service
   * drops it otherwise, so no component can render an undisclosed employer
   * name by mistake — the field is simply not there.
   */
  clientName: string | null
  seoTitle: string | null
  seoDescription: string | null
  ogImagePath: string | null
  images: ProjectImage[]
  pipelineSteps: PipelineStep[]
}

export type ProjectFilters = {
  categories?: ProjectCategory[]
  technologySlugs?: string[]
  statuses?: ProjectStatus[]
}

/* --- Profile, settings --------------------------------------------------- */

export type Profile = {
  fullName: string
  roleTitle: string
  positioningLine: string
  tagline: string | null
  shortBio: string | null
  longBioMd: string | null
  location: string | null
  emailPublic: string | null
  /** Null unless `phone_visible` is true — the gate is applied in the mapper. */
  phonePublic: string | null
  avatarPath: string | null
  avatarAlt: string | null
  ogImagePath: string | null
  availableForWork: boolean
}

/* --- Experience ---------------------------------------------------------- */

export type ExperienceItem = {
  id: string
  content: string
}

export type ExperienceRecord = {
  id: string
  company: string
  companyUrl: string | null
  /** FR-EXP-06: concurrent titles arrive joined by ' · ', as one record. */
  roleTitle: string
  employmentType: string | null
  location: string | null
  startDate: string
  endDate: string | null
  isCurrent: boolean
  summaryMd: string | null
  responsibilities: ExperienceItem[]
  achievements: ExperienceItem[]
  technologies: Technology[]
}

/* --- Skills -------------------------------------------------------------- */

export type Skill = {
  id: string
  name: string
  slug: string
  description: string | null
  /** FR-SKILL-03: there is no proficiency value. This flag and the sort order
   *  are the only emphasis mechanisms that exist. */
  isCore: boolean
}

export type SkillGroup = {
  id: string
  name: string
  slug: string
  description: string | null
  iconKey: string | null
  skills: Skill[]
}

/* --- Education ----------------------------------------------------------- */

export type EducationRecord = {
  id: string
  institution: string
  qualification: string
  fieldOfStudy: string | null
  location: string | null
  startDate: string | null
  endDate: string | null
  status: EducationStatus
  /** Null unless populated AND `show_grade` is true (FR-EDU-04). */
  gradeLabel: string | null
  description: string | null
}

/* --- Social links -------------------------------------------------------- */

export type SocialLink = {
  id: string
  platform: string
  label: string
  url: string
  iconKey: string
  showInHero: boolean
  showInFooter: boolean
}

/* --- Resume -------------------------------------------------------------- */

export type PublishedResume = {
  id: string
  fileName: string
  versionLabel: string | null
  fileSizeBytes: number | null
  storagePath: string
}

/* --- Admin-only shapes --------------------------------------------------- */

/** Admin lists need the fields the public types deliberately omit. */
export type AdminProjectRow = Pick<
  Tables<'projects'>,
  | 'id'
  | 'slug'
  | 'title'
  | 'status'
  | 'category'
  | 'publication_state'
  | 'visibility_mode'
  | 'is_featured'
  | 'sort_order'
  | 'client_disclosed'
  | 'updated_at'
>

export type ContactMessage = {
  id: string
  name: string
  email: string
  company: string | null
  subject: string
  message: string
  serviceType: ServiceType
  status: MessageStatus
  sourcePage: string | null
  adminNotes: string | null
  createdAt: string
  readAt: string | null
  repliedAt: string | null
}
