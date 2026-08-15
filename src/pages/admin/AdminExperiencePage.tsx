import { Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

import { AdminCard, AdminList } from '@/components/admin/AdminList'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Badge, PublicationBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select, Textarea } from '@/components/ui/Field'
import { useAdminExperience, useDeleteExperience, useSaveExperience } from '@/hooks/useAdminContent'
import { useToast } from '@/hooks/useToast'
import { formatDateRange } from '@/lib/dates'
import type { AdminExperience } from '@/services/adminContent.service'
import type { PublicationState } from '@/types/domain'

/**
 * Experience — PRD 20.2, 15, AC-EXP.
 *
 * Two rules shape this form:
 *
 * FR-EXP-06 — concurrent titles are ONE record with the titles joined by ' · '.
 * Three rows would render as three employers, which misstates the CV. The hint
 * on the role field says so, because the instinct is to add a second record.
 *
 * AC-EXP-3 — a current role cannot carry an end date. The database refuses the
 * contradiction (`experience_current_check`), so the form disables the end-date
 * field rather than letting someone fill it in and hit a constraint violation
 * they cannot interpret.
 */

type ExperienceForm = {
  company: string
  company_url: string
  role_title: string
  employment_type: string
  location: string
  start_date: string
  end_date: string
  is_current: boolean
  summary_md: string
  publication_state: PublicationState
  sort_order: number
  responsibilities: string[]
  achievements: string[]
}

const BLANK: ExperienceForm = {
  company: '',
  company_url: '',
  role_title: '',
  employment_type: 'Full-time',
  location: '',
  start_date: '',
  end_date: '',
  is_current: false,
  summary_md: '',
  publication_state: 'draft',
  sort_order: 0,
  responsibilities: [],
  achievements: [],
}

export default function AdminExperiencePage() {
  const { data: records, isPending, isError, error, refetch } = useAdminExperience()
  const [editing, setEditing] = useState<{ id?: string; form: ExperienceForm } | null>(null)

  return (
    <AdminList
      title="Experience"
      description="Roles, with responsibilities and achievements as two separate lists."
      items={records}
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
      onCreate={() => setEditing({ form: BLANK })}
      createLabel="Add role"
      emptyTitle="No experience records yet"
      renderItem={(record) => (
        <ExperienceCard
          record={record}
          onEdit={() => setEditing({ id: record.id, form: toForm(record) })}
        />
      )}
    >
      {editing && (
        <ExperienceEditor initial={editing.form} id={editing.id} onDone={() => setEditing(null)} />
      )}
    </AdminList>
  )
}

function toForm(record: AdminExperience): ExperienceForm {
  return {
    company: record.company,
    company_url: record.company_url ?? '',
    role_title: record.role_title,
    employment_type: record.employment_type ?? '',
    location: record.location ?? '',
    start_date: record.start_date,
    end_date: record.end_date ?? '',
    is_current: record.is_current,
    summary_md: record.summary_md ?? '',
    publication_state: record.publication_state,
    sort_order: record.sort_order,
    responsibilities: record.items
      .filter((i) => i.item_type === 'responsibility')
      .map((i) => i.content),
    achievements: record.items.filter((i) => i.item_type === 'achievement').map((i) => i.content),
  }
}

function ExperienceCard({ record, onEdit }: { record: AdminExperience; onEdit: () => void }) {
  const toast = useToast()
  const remove = useDeleteExperience()

  return (
    <AdminCard
      title={record.company}
      subtitle={record.role_title}
      badges={
        <>
          <PublicationBadge state={record.publication_state} />
          {record.is_current && <Badge tone="success">Current</Badge>}
          <Badge tone="outline">
            {formatDateRange(record.start_date, record.end_date, record.is_current)}
          </Badge>
          <Badge tone="neutral">
            {record.items.filter((i) => i.item_type === 'responsibility').length} responsibilities
          </Badge>
          {record.items.some((i) => i.item_type === 'achievement') && (
            <Badge tone="neutral">
              {record.items.filter((i) => i.item_type === 'achievement').length} achievements
            </Badge>
          )}
        </>
      }
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" aria-label={`Delete ${record.company}`}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            }
            title="Delete this role?"
            recordName={`${record.role_title} — ${record.company}`}
            cascadeNote="Its responsibilities, achievements and technology links are deleted with it."
            onConfirm={() =>
              new Promise<void>((resolve) => {
                remove.mutate(record.id, {
                  onSuccess: () => {
                    toast.success('Role deleted', record.company)
                    resolve()
                  },
                  onError: (cause) => {
                    toast.error("Couldn't delete the role", cause)
                    resolve()
                  },
                })
              })
            }
          />
        </>
      }
    />
  )
}

function ExperienceEditor({
  initial,
  id,
  onDone,
}: {
  initial: ExperienceForm
  id?: string
  onDone: () => void
}) {
  const toast = useToast()
  const save = useSaveExperience()
  const [form, setForm] = useState(initial)
  const ids = {
    company: useId(),
    url: useId(),
    role: useId(),
    type: useId(),
    location: useId(),
    start: useId(),
    end: useId(),
    current: useId(),
    summary: useId(),
    state: useId(),
    order: useId(),
  }

  const set = <K extends keyof ExperienceForm>(key: K, value: ExperienceForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = () => {
    save.mutate(
      {
        id,
        values: {
          company: form.company.trim(),
          company_url: form.company_url.trim() || null,
          role_title: form.role_title.trim(),
          employment_type: form.employment_type.trim() || null,
          location: form.location.trim() || null,
          start_date: form.start_date,
          // AC-EXP-3 — a current role must not carry an end date. Forced null
          // here as well as disabled in the UI, so a stale value left in state
          // cannot reach the constraint.
          end_date: form.is_current ? null : form.end_date || null,
          is_current: form.is_current,
          summary_md: form.summary_md.trim() || null,
          publication_state: form.publication_state,
          sort_order: form.sort_order,
        },
        responsibilities: form.responsibilities,
        achievements: form.achievements,
      },
      {
        onSuccess: () => {
          toast.success(id ? 'Role saved' : 'Role added', form.company)
          onDone()
        },
        onError: (cause) => toast.error("Couldn't save the role", cause),
      },
    )
  }

  return (
    <div className="border-accent/30 bg-surface mt-6 space-y-4 rounded-[--radius-lg] border p-5">
      <h2 className="text-primary font-medium">{id ? 'Edit role' : 'New role'}</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.company} label="Company" required>
          <Input
            id={ids.company}
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
          />
        </FormField>
        <FormField id={ids.url} label="Company URL" hint="Must start with https://">
          <Input
            id={ids.url}
            value={form.company_url}
            onChange={(e) => set('company_url', e.target.value)}
          />
        </FormField>
      </div>

      <FormField
        id={ids.role}
        label="Role title"
        required
        hint="Holding several titles at once? Put them in this ONE field separated by ' · '. Separate records would render as separate employers."
      >
        <Input
          id={ids.role}
          value={form.role_title}
          onChange={(e) => set('role_title', e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.type} label="Employment type">
          <Input
            id={ids.type}
            value={form.employment_type}
            onChange={(e) => set('employment_type', e.target.value)}
          />
        </FormField>
        <FormField id={ids.location} label="Location">
          <Input
            id={ids.location}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.start} label="Start date" required>
          <Input
            id={ids.start}
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
        </FormField>
        <FormField
          id={ids.end}
          label="End date"
          hint={form.is_current ? 'Not applicable — this role is current.' : undefined}
        >
          <Input
            id={ids.end}
            type="date"
            // AC-EXP-3 — disabled rather than left fillable, so the
            // contradiction never reaches the database.
            disabled={form.is_current}
            value={form.is_current ? '' : form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
          />
        </FormField>
      </div>

      <div className="flex items-start gap-2.5">
        <input
          id={ids.current}
          type="checkbox"
          checked={form.is_current}
          onChange={(e) => set('is_current', e.target.checked)}
          className="accent-accent mt-0.5 size-4"
        />
        <label htmlFor={ids.current} className="text-secondary text-sm font-medium">
          Current role — renders as &ldquo;Present&rdquo;
        </label>
      </div>

      <FormField id={ids.summary} label="Summary (markdown)">
        <Textarea
          id={ids.summary}
          rows={3}
          value={form.summary_md}
          onChange={(e) => set('summary_md', e.target.value)}
          className="font-mono text-xs"
        />
      </FormField>

      {/* FR-EXP-03 — two separately labelled, independently ordered lists. */}
      <BulletList
        label="Responsibilities"
        hint="What the role involves, day to day."
        items={form.responsibilities}
        onChange={(items) => set('responsibilities', items)}
      />
      <BulletList
        label="Achievements"
        hint="Only specific, verifiable outcomes. Leave empty rather than inventing one."
        items={form.achievements}
        onChange={(items) => set('achievements', items)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.state} label="Publication state">
          <Select
            id={ids.state}
            value={form.publication_state}
            onChange={(e) => set('publication_state', e.target.value as PublicationState)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </FormField>
        <FormField id={ids.order} label="Sort order" hint="Lower sorts first.">
          <Input
            id={ids.order}
            type="number"
            value={form.sort_order}
            onChange={(e) => set('sort_order', Number(e.target.value) || 0)}
          />
        </FormField>
      </div>

      <div className="flex gap-2">
        <Button
          loading={save.isPending}
          disabled={
            form.company.trim() === '' || form.role_title.trim() === '' || form.start_date === ''
          }
          onClick={handleSave}
        >
          {id ? 'Save' : 'Add role'}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** An ordered, editable bullet list. Order is the array order. */
function BulletList({
  label,
  hint,
  items,
  onChange,
}: {
  label: string
  hint?: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [moved] = next.splice(index, 1)
    if (moved !== undefined) next.splice(target, 0, moved)
    onChange(next)
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-secondary text-sm font-medium">{label}</legend>
      {hint && <p className="text-muted text-xs">{hint}</p>}

      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <Input
            value={item}
            aria-label={`${label} ${index + 1}`}
            onChange={(e) => onChange(items.map((v, i) => (i === index ? e.target.value : v)))}
          />
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              aria-label={`Move ${label} ${index + 1} up`}
            >
              ↑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
              aria-label={`Move ${label} ${index + 1} down`}
            >
              ↓
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`Remove ${label} ${index + 1}`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={() => onChange([...items, ''])}>
        <Plus className="size-3.5" aria-hidden="true" />
        Add {label.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')}
      </Button>
    </fieldset>
  )
}
