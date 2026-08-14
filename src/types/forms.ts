import { z } from 'zod'

/**
 * Form schemas — PRD FR-CONT-03, SEC-04, tested per 41.1.
 *
 * Every bound below mirrors a CHECK constraint in
 * 20260815090600_create_contact_tables.sql. That duplication is deliberate and
 * must be kept in sync: the Supabase endpoint is publicly reachable with the
 * publishable key, so this schema produces good error messages while the
 * database constraints are the actual rule. If the two drift, a visitor gets a
 * generic save failure with no field to correct.
 */

export const SERVICE_TYPES = [
  'ai_automation',
  'web_application',
  'business_process_automation',
  'other',
] as const

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number]

export const SERVICE_TYPE_LABELS: Record<ServiceTypeValue, string> = {
  ai_automation: 'AI automation',
  web_application: 'Web application',
  business_process_automation: 'Business process automation',
  other: 'Something else',
}

/** FR-CONT-02: an unrecognised `?service=` falls back to `other` rather than
 *  erroring — a bad link should not block a visitor from writing in. */
export function coerceServiceType(value: string | null | undefined): ServiceTypeValue {
  return SERVICE_TYPES.includes(value as ServiceTypeValue) ? (value as ServiceTypeValue) : 'other'
}

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your name.')
    .max(80, 'Name must be 80 characters or fewer.'),

  email: z
    .string()
    .trim()
    .toLowerCase() // stored lowercased (18.1)
    .max(160, 'Email must be 160 characters or fewer.')
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Please enter a valid email address.'),

  company: z
    .string()
    .trim()
    .max(120, 'Company must be 120 characters or fewer.')
    .optional()
    .or(z.literal('')),

  subject: z
    .string()
    .trim()
    .min(3, 'Please add a subject.')
    .max(150, 'Subject must be 150 characters or fewer.'),

  message: z
    .string()
    .trim()
    .min(20, 'Please write at least 20 characters so Moin can reply usefully.')
    .max(4000, 'Message must be 4000 characters or fewer.'),

  serviceType: z.enum(SERVICE_TYPES),

  /**
   * FR-CONT-08 honeypot. Rendered off-screen with `aria-hidden` and
   * `tabindex="-1"` — never `display: none`, which some bots detect and skip.
   * A human cannot reach it; anything that fills it is not a human.
   */
  website: z.literal('', { message: 'Rejected.' }).optional(),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

/** Live counter appears from here (18.1). */
export const MESSAGE_COUNTER_THRESHOLD = 3500
export const MESSAGE_MAX_LENGTH = 4000
