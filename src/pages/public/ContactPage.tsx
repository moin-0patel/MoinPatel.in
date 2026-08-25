import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'

import { SEO } from '@/components/common/SEO'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FormField, HoneypotField, Input, Select, Textarea } from '@/components/ui/Field'
import { useContactForm } from '@/hooks/useContactForm'
import { describedBy } from '@/lib/fieldA11y'
import { useProfile, useSettings } from '@/hooks/useSiteContent'
import { AppError } from '@/lib/errors'
import { pageTitle } from '@/lib/seo'
import { buildMailtoFallback } from '@/services/contact.service'
import {
  coerceServiceType,
  contactFormSchema,
  MESSAGE_COUNTER_THRESHOLD,
  MESSAGE_MAX_LENGTH,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
  type ContactFormValues,
} from '@/types/forms'

/**
 * Contact — PRD Section 18.
 *
 * The validation here is a courtesy, not the rule. Every bound in
 * `contactFormSchema` mirrors a CHECK constraint, and the spam controls live in
 * database triggers, because the Supabase endpoint is publicly reachable with
 * the publishable key (SEC-04, TD-11). This form exists to give a human good
 * error messages; the database is what actually refuses bad input.
 */
export default function ContactPage() {
  const [searchParams] = useSearchParams()
  const { data: profile } = useProfile()
  const { data: settings } = useSettings()
  const mutation = useContactForm()

  const [submitted, setSubmitted] = useState(false)

  /*
   * FR-CONT-08 — the timing check. Captured once on first render and sent with
   * the submission; the trigger compares it to now(), rejects anything under
   * three seconds, and then nulls the column so it is never retained as
   * per-visitor telemetry.
   */
  const formRenderedAt = useRef(new Date())

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    // FR-CONT-04 — validate on blur, then keep re-validating as the user
    // fixes it. Validating on every keystroke from the start flags a field as
    // invalid while it is still being typed into, which reads as nagging.
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      company: '',
      subject: '',
      message: '',
      // FR-CONT-02 — prefilled from ?service=, with an invalid value falling
      // back to `other` rather than erroring.
      serviceType: coerceServiceType(searchParams.get('service')),
      website: '',
    },
  })

  const messageLength = watch('message')?.length ?? 0

  const ids = {
    name: useId(),
    email: useId(),
    company: useId(),
    subject: useId(),
    message: useId(),
    serviceType: useId(),
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        ...values,
        sourcePage: `${window.location.pathname}${window.location.search}`,
        formRenderedAt: formRenderedAt.current,
      })
      // FR-CONT-06 — values are cleared ONLY on success.
      reset()
      setSubmitted(true)
    } catch {
      // FR-CONT-07 — on failure every entered value is preserved. The error is
      // surfaced from `mutation.error` below; swallowing it here is deliberate
      // so react-hook-form does not also treat it as a field error.
    }
  })

  const mailtoFallback = useMemo(() => {
    const email = profile?.emailPublic
    if (!email) return null
    return buildMailtoFallback(email, getValues())
  }, [profile?.emailPublic, getValues])

  return (
    <>
      <SEO
        title={pageTitle('Contact')}
        description="Describe a manual process worth automating and Moin Patel will tell you whether it can be replaced with a system."
        canonicalPath="/contact"
      />

      <div className="container-page py-12 md:py-20">
        <header className="mb-10">
          {/* Flat ink. This carried the old palette's black -> cyan gradient
              through the glyphs; the reference uses no gradient type at all.
              See the matching note on the case-study title. */}
          <h1 className="text-primary font-display text-3xl leading-[1.1] font-bold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Let&rsquo;s Talk
          </h1>
          <p className="text-secondary measure mt-4">
            Describe what your team does by hand today. If it can be automated, I&rsquo;ll tell you
            how — and if it can&rsquo;t, I&rsquo;ll tell you that too.
          </p>
        </header>

        <div className="grid gap-12 lg:grid-cols-[1fr_280px] lg:gap-16">
          <div className="min-w-0">
            {submitted ? (
              <SuccessState
                responseNote={settings?.contactResponseNote ?? null}
                onSendAnother={() => {
                  setSubmitted(false)
                  mutation.reset()
                  // A fresh timing baseline: the previous one is minutes old
                  // and would otherwise sail past the 3s check for free.
                  formRenderedAt.current = new Date()
                }}
              />
            ) : (
              <form onSubmit={(e) => void onSubmit(e)} noValidate className="relative space-y-5">
                {/* FR-CONT-07 — a non-destructive error above the form, with a
                    mailto fallback so a broken form never costs an enquiry. */}
                {mutation.isError && (
                  <div
                    role="alert"
                    className="border-danger/30 bg-danger-soft rounded-[--radius-md] border p-4"
                  >
                    <p className="text-danger text-sm font-medium">
                      {mutation.error instanceof AppError
                        ? mutation.error.userMessage
                        : "Your message couldn't be sent."}
                    </p>
                    <p className="text-secondary mt-1 text-sm">
                      Nothing you typed has been lost.{' '}
                      {mailtoFallback && (
                        <>
                          You can also{' '}
                          <a href={mailtoFallback} className="text-accent underline">
                            send it by email instead
                          </a>
                          .
                        </>
                      )}
                    </p>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField id={ids.name} label="Name" required error={errors.name?.message}>
                    <Input
                      id={ids.name}
                      autoComplete="name" // RES-08
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={describedBy(ids.name, Boolean(errors.name), false)}
                      {...register('name')}
                    />
                  </FormField>

                  <FormField id={ids.email} label="Email" required error={errors.email?.message}>
                    <Input
                      id={ids.email}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={describedBy(ids.email, Boolean(errors.email), false)}
                      {...register('email')}
                    />
                  </FormField>
                </div>

                <FormField id={ids.company} label="Company" error={errors.company?.message}>
                  <Input
                    id={ids.company}
                    autoComplete="organization"
                    aria-invalid={Boolean(errors.company)}
                    {...register('company')}
                  />
                </FormField>

                <FormField
                  id={ids.serviceType}
                  label="What do you need?"
                  required
                  error={errors.serviceType?.message}
                >
                  <Select
                    id={ids.serviceType}
                    aria-invalid={Boolean(errors.serviceType)}
                    {...register('serviceType')}
                  >
                    {SERVICE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {SERVICE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  id={ids.subject}
                  label="Subject"
                  required
                  error={errors.subject?.message}
                >
                  <Input
                    id={ids.subject}
                    aria-invalid={Boolean(errors.subject)}
                    {...register('subject')}
                  />
                </FormField>

                <FormField
                  id={ids.message}
                  label="Message"
                  required
                  error={errors.message?.message}
                  hint="What does the process look like today, and who does it?"
                  counter={
                    // 18.1 — the counter appears from 3500 characters, not from
                    // zero. A counter on an empty box is pressure, not help.
                    messageLength >= MESSAGE_COUNTER_THRESHOLD ? (
                      <span
                        className="text-muted font-mono text-xs"
                        role="status"
                        aria-live="polite"
                      >
                        {messageLength} / {MESSAGE_MAX_LENGTH}
                      </span>
                    ) : null
                  }
                >
                  <Textarea
                    id={ids.message}
                    rows={7}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={describedBy(ids.message, Boolean(errors.message), true)}
                    {...register('message')}
                  />
                </FormField>

                <HoneypotField {...register('website')} />

                {/* 18.1 — the consent line. Plain, and true. */}
                <p className="text-muted text-xs">
                  Your message is stored so Moin can reply. It is not shared or used for marketing.
                </p>

                {/* FR-CONT-05 — loading state, disabled while pending, so a
                    double submit cannot create two messages. */}
                <Button type="submit" size="lg" loading={isSubmitting || mutation.isPending}>
                  Send message
                </Button>
              </form>
            )}
          </div>

          <DirectChannels
            email={profile?.emailPublic ?? null}
            phone={profile?.phonePublic ?? null}
            location={profile?.location ?? null}
          />
        </div>
      </div>
    </>
  )
}

/** FR-CONT-06 — success replaces the form entirely and offers a way back. */
function SuccessState({
  responseNote,
  onSendAnother,
}: {
  responseNote: string | null
  onSendAnother: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-success/30 bg-success-soft/40 rounded-[--radius-lg] border p-8 text-center"
    >
      <CheckCircle2 className="text-success mx-auto size-8" aria-hidden="true" />
      <h2 className="text-primary font-display mt-4 text-xl font-semibold">Message sent</h2>
      <p className="text-secondary measure mx-auto mt-2 text-sm">
        Thanks — it&rsquo;s landed.
        {/* Q-19: no response time is promised until Moin states one. */}
        {responseNote ? ` ${responseNote}` : ''}
      </p>
      <Button variant="secondary" className="mt-6" onClick={onSendAnother}>
        Send another message
      </Button>
    </div>
  )
}

/**
 * 18.3 — direct channels.
 *
 * The phone number renders only when `phone_visible` is true, and the service
 * mapper has already nulled it otherwise (Q-10 defaults to hidden, because
 * publishing a personal number invites spam calls). So `phone` arriving
 * non-null here means it has been deliberately cleared for display.
 */
function DirectChannels({
  email,
  phone,
  location,
}: {
  email: string | null
  phone: string | null
  location: string | null
}) {
  if (!email && !phone && !location) return null

  return (
    <Card as="aside" aria-labelledby="direct-channels-heading">
      {/* Design's live-status chip. Decorative, so it is hidden from AT. */}
      <p
        aria-hidden="true"
        className="text-accent mb-4 flex items-center gap-2 font-mono text-xs tracking-[--tracking-mono] uppercase"
      >
        <span className="bg-success size-1.5 shrink-0 rounded-full" />
        Available
      </p>
      <h2
        id="direct-channels-heading"
        className="text-muted mb-4 font-mono text-xs tracking-[--tracking-mono] uppercase"
      >
        Or reach me directly
      </h2>
      <ul className="space-y-3">
        {email && (
          <li className="flex items-start gap-2.5">
            <Mail className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <a
              href={`mailto:${email}`}
              className="text-secondary hover:text-primary text-sm break-all"
            >
              {email}
            </a>
          </li>
        )}
        {phone && (
          <li className="flex items-start gap-2.5">
            <Phone className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="text-secondary hover:text-primary text-sm"
            >
              {phone}
            </a>
          </li>
        )}
        {location && (
          <li className="flex items-start gap-2.5">
            <MapPin className="text-accent mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="text-secondary text-sm">{location}</span>
          </li>
        )}
      </ul>
    </Card>
  )
}
