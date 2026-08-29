import { Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

import { AdminCard, AdminList } from '@/components/admin/AdminList'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select } from '@/components/ui/Field'
import {
  useAdminSocialLinks,
  useDeleteSocialLink,
  useSaveSocialLink,
} from '@/hooks/useAdminContent'
import { useToast } from '@/hooks/useToast'
import type { Tables } from '@/types/database.types'

/**
 * Social links — PRD 20.2, 23.13, FR-NAV-03.
 *
 * Database-driven rather than hard-coded so a profile can be added without a
 * commit (Principle 5). This screen is where Q-02 and Q-03 get answered: the
 * seed ships LinkedIn and GitHub as UNPUBLISHED rows with placeholder URLs, so
 * the real ones are pasted in here and the switch flipped.
 *
 * Publishing a row with a placeholder URL would put a dead link in the hero —
 * exactly the Persona 1 failure mode ("the resume is a broken link") — so the
 * form warns when a URL still looks like a placeholder.
 */

const ICON_KEYS = ['linkedin', 'github', 'mail'] as const

type LinkForm = {
  platform: string
  label: string
  url: string
  icon_key: string
  show_in_hero: boolean
  show_in_footer: boolean
  sort_order: number
  published: boolean
}

const BLANK: LinkForm = {
  platform: '',
  label: '',
  url: '',
  icon_key: 'linkedin',
  show_in_hero: true,
  show_in_footer: true,
  sort_order: 0,
  published: false,
}

/** The seed's placeholders. Publishing one of these ships a dead link. */
function looksLikePlaceholder(url: string): boolean {
  return /REQUIRES-USER-INPUT/i.test(url)
}

export default function AdminSocialLinksPage() {
  const { data: links, isPending, isError, error, refetch } = useAdminSocialLinks()
  const [editing, setEditing] = useState<{ id?: string; form: LinkForm } | null>(null)

  return (
    <AdminList
      title="Social links"
      description="Shown in the hero and the footer. Unpublished links appear nowhere."
      items={links}
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
      onCreate={() => setEditing({ form: BLANK })}
      createLabel="Add link"
      emptyTitle="No social links yet"
      emptyDescription="Add LinkedIn, GitHub or anywhere else worth pointing people."
      renderItem={(link) => (
        <SocialLinkCard
          link={link}
          onEdit={() => setEditing({ id: link.id, form: toForm(link) })}
        />
      )}
    >
      {editing && (
        <LinkEditor initial={editing.form} id={editing.id} onDone={() => setEditing(null)} />
      )}
    </AdminList>
  )
}

function toForm(link: Tables<'social_links'>): LinkForm {
  return {
    platform: link.platform,
    label: link.label,
    url: link.url,
    icon_key: link.icon_key,
    show_in_hero: link.show_in_hero,
    show_in_footer: link.show_in_footer,
    sort_order: link.sort_order,
    published: link.published,
  }
}

function SocialLinkCard({ link, onEdit }: { link: Tables<'social_links'>; onEdit: () => void }) {
  const toast = useToast()
  const remove = useDeleteSocialLink()
  const save = useSaveSocialLink()

  const placeholder = looksLikePlaceholder(link.url)

  const togglePublished = () => {
    save.mutate(
      { id: link.id, values: { ...toForm(link), published: !link.published } },
      {
        onSuccess: () => toast.success(link.published ? 'Unpublished' : 'Published', link.label),
        onError: (cause) => toast.error("Couldn't change the state", cause),
      },
    )
  }

  return (
    <AdminCard
      title={link.label}
      subtitle={<span className="font-mono text-xs break-all">{link.url}</span>}
      badges={
        <>
          <Badge tone={link.published ? 'success' : 'neutral'}>
            {link.published ? 'Published' : 'Unpublished'}
          </Badge>
          {link.show_in_hero && <Badge tone="outline">Hero</Badge>}
          {link.show_in_footer && <Badge tone="outline">Footer</Badge>}
          {placeholder && <Badge tone="warning">Placeholder URL</Badge>}
        </>
      }
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={save.isPending}
            // Publishing a placeholder would put a dead link in the hero.
            disabled={!link.published && placeholder}
            onClick={togglePublished}
          >
            {link.published ? 'Unpublish' : 'Publish'}
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" aria-label={`Delete ${link.label}`}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            }
            title="Delete this link?"
            recordName={`${link.label} — ${link.url}`}
            onConfirm={() =>
              new Promise<void>((resolve) => {
                remove.mutate(link.id, {
                  onSuccess: () => {
                    toast.success('Link deleted', link.label)
                    resolve()
                  },
                  onError: (cause) => {
                    toast.error("Couldn't delete the link", cause)
                    resolve()
                  },
                })
              })
            }
          />
        </>
      }
    >
      {!link.published && placeholder && (
        <p className="text-warning mt-3 text-xs">
          This is the seed placeholder. Paste the real URL before publishing — a dead link in the
          hero is worse than no link.
        </p>
      )}
    </AdminCard>
  )
}

function LinkEditor({
  initial,
  id,
  onDone,
}: {
  initial: LinkForm
  id?: string
  onDone: () => void
}) {
  const toast = useToast()
  const save = useSaveSocialLink()
  const [form, setForm] = useState(initial)
  const ids = { platform: useId(), label: useId(), url: useId(), icon: useId(), order: useId() }

  const set = <K extends keyof LinkForm>(key: K, value: LinkForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  // Mirrors the social_links_url_check CHECK constraint.
  const urlValid = form.url.startsWith('https://') || form.url.startsWith('mailto:')

  const handleSave = () => {
    save.mutate(
      { id, values: form },
      {
        onSuccess: () => {
          toast.success(id ? 'Link saved' : 'Link added', form.label)
          onDone()
        },
        onError: (cause) => toast.error("Couldn't save the link", cause),
      },
    )
  }

  return (
    <div className="border-accent/30 bg-surface mt-6 space-y-4 rounded-(--radius-lg) border p-5">
      <h2 className="text-primary font-medium">{id ? 'Edit link' : 'New link'}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.platform} label="Platform" hint="Lowercase key, e.g. linkedin.">
          <Input
            id={ids.platform}
            value={form.platform}
            onChange={(e) => set('platform', e.target.value)}
          />
        </FormField>
        <FormField id={ids.label} label="Label" hint="What the link says.">
          <Input id={ids.label} value={form.label} onChange={(e) => set('label', e.target.value)} />
        </FormField>
      </div>

      <FormField
        id={ids.url}
        label="URL"
        hint="Must start with https:// or mailto:"
        error={form.url !== '' && !urlValid ? 'Must start with https:// or mailto:' : undefined}
      >
        <Input
          id={ids.url}
          value={form.url}
          onChange={(e) => set('url', e.target.value)}
          className="font-mono"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.icon} label="Icon">
          <Select
            id={ids.icon}
            value={form.icon_key}
            onChange={(e) => set('icon_key', e.target.value)}
          >
            {ICON_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField id={ids.order} label="Sort order">
          <Input
            id={ids.order}
            type="number"
            value={form.sort_order}
            onChange={(e) => set('sort_order', Number(e.target.value) || 0)}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap gap-5">
        <Check
          label="Show in hero"
          checked={form.show_in_hero}
          onChange={(v) => set('show_in_hero', v)}
        />
        <Check
          label="Show in footer"
          checked={form.show_in_footer}
          onChange={(v) => set('show_in_footer', v)}
        />
        <Check label="Published" checked={form.published} onChange={(v) => set('published', v)} />
      </div>

      {form.published && looksLikePlaceholder(form.url) && (
        <p className="border-warning/30 bg-warning-soft text-warning rounded-(--radius-sm) border px-3 py-2 text-xs">
          This URL is still the seed placeholder. Publishing it puts a dead link on the site.
        </p>
      )}

      <div className="flex gap-2">
        <Button
          loading={save.isPending}
          disabled={!urlValid || form.label.trim() === ''}
          onClick={handleSave}
        >
          {id ? 'Save' : 'Add link'}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent size-4"
      />
      <label htmlFor={id} className="text-secondary text-sm">
        {label}
      </label>
    </div>
  )
}
