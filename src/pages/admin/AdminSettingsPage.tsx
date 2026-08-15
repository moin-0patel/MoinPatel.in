import { useEffect, useId, useState } from 'react'

import { ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Textarea } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useAdminProfile,
  useAdminSettings,
  useUpdateProfile,
  useUpdateSetting,
} from '@/hooks/useAdminContent'
import { useToast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { cn } from '@/lib/cn'

/**
 * Settings — PRD 20.2, 23.1, 23.15.
 *
 * Two resources on one screen because they answer the same question ("what
 * does the site say about itself?"): the `profiles` singleton and the
 * `site_settings` key/value table.
 *
 * This screen is where several blocking open questions get resolved without
 * anyone touching SQL — Q-12 (the bio), Q-19 (response time), Q-20
 * (availability wording), Q-11 (canonical URL), Q-10 (phone visibility). The
 * field hints say so, so whoever fills them in knows what they are deciding.
 *
 * `is_public` is not editable here. It drives the anon read policy (25.1), so
 * a UI slip would become a data leak; changing a key's visibility is a
 * migration.
 */

/** Only keys a human should type into. Booleans get switches; the rest are text. */
const EDITABLE_SETTINGS: {
  key: string
  label: string
  hint: string
  type: 'text' | 'textarea' | 'boolean'
}[] = [
  {
    key: 'site_title',
    label: 'Site title',
    hint: 'Default browser tab title and og:site_name.',
    type: 'text',
  },
  {
    key: 'site_description',
    label: 'Site description',
    hint: 'Default meta description, used wherever a page has none of its own.',
    type: 'textarea',
  },
  {
    key: 'availability_label',
    label: 'Availability pill',
    hint: 'Q-20. Text of the green pill in the hero, e.g. "Open to freelance work". Leave empty to hide the pill entirely.',
    type: 'text',
  },
  {
    key: 'contact_response_note',
    label: 'Response time note',
    hint: 'Q-19. Shown after a successful contact submission, e.g. "I usually reply within two working days". Leave empty rather than promising a time you cannot keep.',
    type: 'text',
  },
  {
    key: 'canonical_base_url',
    label: 'Canonical base URL',
    hint: 'Q-11. The live origin, no trailing slash, e.g. https://moinpatel.in. Used for canonical tags and the sitemap.',
    type: 'text',
  },
  {
    key: 'default_og_image_path',
    label: 'Default social image path',
    hint: 'Path in the profile bucket, 1200x630. Used when a page has no image of its own.',
    type: 'text',
  },
  {
    key: 'nav_resume_visible',
    label: 'Show the Resume link in the header',
    hint: 'Also requires a published resume to exist.',
    type: 'boolean',
  },
  {
    key: 'analytics_enabled',
    label: 'Collect analytics',
    hint: 'Q-23. Off until decided. No IPs, no cookies, no cross-site identifiers.',
    type: 'boolean',
  },
  {
    key: 'maintenance_mode',
    label: 'Maintenance mode',
    hint: 'Public pages show a notice. The admin stays reachable.',
    type: 'boolean',
  },
]

export default function AdminSettingsPage() {
  const profileQuery = useAdminProfile()
  const settingsQuery = useAdminSettings()

  if (profileQuery.isPending || settingsQuery.isPending) {
    return (
      <div className="space-y-3 p-6 lg:p-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-96 w-full rounded-[--radius-lg]" />
      </div>
    )
  }

  if (profileQuery.isError || settingsQuery.isError) {
    return (
      <div className="p-6 lg:p-8">
        <ErrorState
          error={profileQuery.error ?? settingsQuery.error}
          onRetry={() => {
            void profileQuery.refetch()
            void settingsQuery.refetch()
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-primary text-2xl">Settings</h1>
      <p className="text-secondary mt-1 text-sm">Your profile and how the site describes itself.</p>

      <div className="mt-8 max-w-2xl space-y-12">
        <ProfileForm profile={profileQuery.data} />
        <SettingsForm settings={settingsQuery.data} />
      </div>
    </div>
  )
}

/* --- Profile -------------------------------------------------------------- */

type ProfileForm = {
  full_name: string
  role_title: string
  positioning_line: string
  tagline: string
  short_bio: string
  long_bio_md: string
  location: string
  email_public: string
  phone_public: string
  phone_visible: boolean
  avatar_alt: string
  available_for_work: boolean
}

function ProfileForm({ profile }: { profile: ReturnType<typeof useAdminProfile>['data'] }) {
  const toast = useToast()
  const update = useUpdateProfile()
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name: profile.full_name,
      role_title: profile.role_title,
      positioning_line: profile.positioning_line,
      tagline: profile.tagline ?? '',
      short_bio: profile.short_bio ?? '',
      long_bio_md: profile.long_bio_md ?? '',
      location: profile.location ?? '',
      email_public: profile.email_public ?? '',
      phone_public: profile.phone_public ?? '',
      phone_visible: profile.phone_visible,
      avatar_alt: profile.avatar_alt ?? '',
      available_for_work: profile.available_for_work,
    })
    setDirty(false)
  }, [profile])

  const guard = useUnsavedChanges(dirty)
  void guard // the dialog lives on the project editor; here the browser prompt is enough

  if (!profile || !form) {
    return (
      <section>
        <h2 className="text-primary text-lg">Profile</h2>
        <p className="text-secondary mt-2 text-sm">
          No profile row exists. The seed creates it — run the seed against this database first.
        </p>
      </section>
    )
  }

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
    setDirty(true)
  }

  const handleSave = () => {
    update.mutate(
      {
        id: profile.id,
        patch: {
          full_name: form.full_name.trim(),
          role_title: form.role_title.trim(),
          positioning_line: form.positioning_line.trim(),
          // Empty string means "not set" — the UI hides these rather than
          // rendering an empty element, so they must be stored as null.
          tagline: form.tagline.trim() || null,
          short_bio: form.short_bio.trim() || null,
          long_bio_md: form.long_bio_md.trim() || null,
          location: form.location.trim() || null,
          email_public: form.email_public.trim() || null,
          phone_public: form.phone_public.trim() || null,
          phone_visible: form.phone_visible,
          avatar_alt: form.avatar_alt.trim() || null,
          available_for_work: form.available_for_work,
        },
      },
      {
        onSuccess: () => {
          setDirty(false)
          toast.success('Profile saved')
        },
        onError: (cause) => toast.error("Couldn't save the profile", cause),
      },
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-primary text-lg">Profile</h2>
        {dirty && <span className="text-warning text-sm">Unsaved changes</span>}
      </div>

      <Field label="Full name" value={form.full_name} onChange={(v) => set('full_name', v)} />
      <Field label="Role title" value={form.role_title} onChange={(v) => set('role_title', v)} />
      <Field
        label="Positioning line"
        hint="The largest line in the hero. This is approved copy — change it deliberately."
        value={form.positioning_line}
        onChange={(v) => set('positioning_line', v)}
      />
      <Field
        label="Tagline"
        hint="One or two sentences under the positioning line. Optional."
        value={form.tagline}
        onChange={(v) => set('tagline', v)}
      />

      <AreaField
        label="Short bio"
        hint="Q-12. 60–80 words, in your own words. Shown in the About section on the homepage; the section is hidden entirely while this is empty."
        rows={4}
        value={form.short_bio}
        onChange={(v) => set('short_bio', v)}
      />
      <AreaField
        label="Long bio (markdown)"
        hint="Q-12. 200–300 words for the /about page."
        rows={10}
        value={form.long_bio_md}
        onChange={(v) => set('long_bio_md', v)}
        mono
      />

      <Field label="Location" value={form.location} onChange={(v) => set('location', v)} />
      <Field
        label="Public email"
        value={form.email_public}
        onChange={(v) => set('email_public', v)}
      />
      <Field
        label="Phone"
        hint="Stored either way. Only rendered publicly if the switch below is on."
        value={form.phone_public}
        onChange={(v) => set('phone_public', v)}
      />
      <Toggle
        label="Show the phone number publicly"
        hint="Q-10. Off by default — publishing a personal number invites spam calls."
        checked={form.phone_visible}
        onChange={(v) => set('phone_visible', v)}
      />
      <Field
        label="Avatar alt text"
        hint="Required by the database once a photo is uploaded. Usually just your name."
        value={form.avatar_alt}
        onChange={(v) => set('avatar_alt', v)}
      />
      <Toggle
        label="Available for work"
        hint="Shows the hero pill — but only if the availability text is also set below."
        checked={form.available_for_work}
        onChange={(v) => set('available_for_work', v)}
      />

      <Button loading={update.isPending} onClick={handleSave}>
        Save profile
      </Button>
    </section>
  )
}

/* --- Site settings -------------------------------------------------------- */

function SettingsForm({ settings }: { settings: ReturnType<typeof useAdminSettings>['data'] }) {
  const toast = useToast()
  const update = useUpdateSetting()
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!settings) return
    setValues(Object.fromEntries(settings.map((row) => [row.key, row.value])))
    setDirtyKeys(new Set())
  }, [settings])

  const set = (key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }))
    setDirtyKeys((current) => new Set(current).add(key))
  }

  const saveOne = (key: string) => {
    // Empty string is stored as JSON null, because every consumer treats null
    // as "hide this element" and "" as a visible empty string.
    const raw = values[key]
    const value = typeof raw === 'string' && raw.trim() === '' ? null : raw

    update.mutate(
      { key, value },
      {
        onSuccess: () => {
          setDirtyKeys((current) => {
            const next = new Set(current)
            next.delete(key)
            return next
          })
          toast.success('Setting saved', key)
        },
        onError: (cause) => toast.error("Couldn't save the setting", cause),
      },
    )
  }

  const byKey = new Map((settings ?? []).map((row) => [row.key, row]))

  return (
    <section className="space-y-5">
      <h2 className="text-primary text-lg">Site settings</h2>

      {EDITABLE_SETTINGS.map((setting) => {
        const row = byKey.get(setting.key)
        if (!row) return null
        const isDirty = dirtyKeys.has(setting.key)
        const value = values[setting.key]

        return (
          <div
            key={setting.key}
            className={cn(
              'border-subtle rounded-[--radius-md] border p-4',
              isDirty && 'border-warning/40',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-muted font-mono text-xs">{setting.key}</span>
              {/* 25.1 — visibility is shown but not editable. */}
              {!row.is_public && <Badge tone="outline">private</Badge>}
            </div>

            {setting.type === 'boolean' ? (
              <Toggle
                label={setting.label}
                hint={setting.hint}
                checked={value === true}
                onChange={(v) => set(setting.key, v)}
              />
            ) : setting.type === 'textarea' ? (
              <AreaField
                label={setting.label}
                hint={setting.hint}
                rows={3}
                value={typeof value === 'string' ? value : ''}
                onChange={(v) => set(setting.key, v)}
              />
            ) : (
              <Field
                label={setting.label}
                hint={setting.hint}
                value={typeof value === 'string' ? value : ''}
                onChange={(v) => set(setting.key, v)}
              />
            )}

            {isDirty && (
              <Button
                size="sm"
                className="mt-3"
                loading={update.isPending}
                onClick={() => saveOne(setting.key)}
              >
                Save
              </Button>
            )}
          </div>
        )
      })}
    </section>
  )
}

/* --- fields --------------------------------------------------------------- */

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const id = useId()
  return (
    <FormField id={id} label={label} hint={hint}>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  )
}

function AreaField({
  label,
  value,
  onChange,
  hint,
  rows = 4,
  mono = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  rows?: number
  mono?: boolean
}) {
  const id = useId()
  return (
    <FormField id={id} label={label} hint={hint}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={mono ? 'font-mono text-xs' : undefined}
      />
    </FormField>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-accent mt-0.5 size-4 shrink-0"
        />
        <label htmlFor={id} className="text-secondary text-sm font-medium">
          {label}
        </label>
      </div>
      {hint && <p className="text-muted pl-6.5 text-xs">{hint}</p>}
    </div>
  )
}
