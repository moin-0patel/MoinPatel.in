import { Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

import { AdminCard, AdminList } from '@/components/admin/AdminList'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { Badge, PublicationBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input, Select, Textarea } from '@/components/ui/Field'
import { useAdminEducation, useDeleteEducation, useSaveEducation } from '@/hooks/useAdminContent'
import { useToast } from '@/hooks/useToast'
import { formatEducationStatus } from '@/lib/dates'
import type { Tables } from '@/types/database.types'
import type { EducationStatus, PublicationState } from '@/types/domain'

/**
 * Education — PRD 20.2, 17.
 *
 * FR-EDU-04 is the rule this screen has to make visible: a grade renders only
 * when it is populated AND `show_grade` is on. Two separate switches, because
 * "I recorded my Class XII percentage" and "I want it on my portfolio" are
 * different decisions — Q-18 exists precisely because the answer to the second
 * is usually no for an audience of business clients.
 */

type EducationForm = {
  institution: string
  qualification: string
  field_of_study: string
  location: string
  start_date: string
  end_date: string
  status: EducationStatus
  grade_label: string
  show_grade: boolean
  description: string
  publication_state: PublicationState
  sort_order: number
}

const BLANK: EducationForm = {
  institution: '',
  qualification: '',
  field_of_study: '',
  location: '',
  start_date: '',
  end_date: '',
  status: 'completed',
  grade_label: '',
  show_grade: false,
  description: '',
  publication_state: 'draft',
  sort_order: 0,
}

export default function AdminEducationPage() {
  const { data: records, isPending, isError, error, refetch } = useAdminEducation()
  const [editing, setEditing] = useState<{ id?: string; form: EducationForm } | null>(null)

  return (
    <AdminList
      title="Education"
      description="Rendered on /about and in the homepage education section."
      items={records}
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={() => void refetch()}
      onCreate={() => setEditing({ form: BLANK })}
      createLabel="Add qualification"
      emptyTitle="No education records yet"
      renderItem={(record) => (
        <EducationCard
          record={record}
          onEdit={() => setEditing({ id: record.id, form: toForm(record) })}
        />
      )}
    >
      {editing && (
        <EducationEditor initial={editing.form} id={editing.id} onDone={() => setEditing(null)} />
      )}
    </AdminList>
  )
}

function toForm(record: Tables<'education'>): EducationForm {
  return {
    institution: record.institution,
    qualification: record.qualification,
    field_of_study: record.field_of_study ?? '',
    location: record.location ?? '',
    start_date: record.start_date ?? '',
    end_date: record.end_date ?? '',
    status: record.status,
    grade_label: record.grade_label ?? '',
    show_grade: record.show_grade,
    description: record.description ?? '',
    publication_state: record.publication_state,
    sort_order: record.sort_order,
  }
}

function EducationCard({ record, onEdit }: { record: Tables<'education'>; onEdit: () => void }) {
  const toast = useToast()
  const remove = useDeleteEducation()

  return (
    <AdminCard
      title={record.qualification}
      subtitle={record.institution}
      badges={
        <>
          <PublicationBadge state={record.publication_state} />
          <Badge tone="outline">{formatEducationStatus(record.status, record.end_date)}</Badge>
          {/* FR-EDU-04 — a grade that exists but is switched off should be
              visible HERE, so nobody wonders why it is missing on the site. */}
          {record.grade_label && (
            <Badge tone={record.show_grade ? 'accent' : 'neutral'}>
              {record.grade_label} {record.show_grade ? '(shown)' : '(hidden)'}
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
              <Button variant="ghost" size="sm" aria-label={`Delete ${record.qualification}`}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            }
            title="Delete this qualification?"
            recordName={`${record.qualification} — ${record.institution}`}
            onConfirm={() =>
              new Promise<void>((resolve) => {
                remove.mutate(record.id, {
                  onSuccess: () => {
                    toast.success('Deleted', record.qualification)
                    resolve()
                  },
                  onError: (cause) => {
                    toast.error("Couldn't delete", cause)
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

function EducationEditor({
  initial,
  id,
  onDone,
}: {
  initial: EducationForm
  id?: string
  onDone: () => void
}) {
  const toast = useToast()
  const save = useSaveEducation()
  const [form, setForm] = useState(initial)
  const ids = {
    institution: useId(),
    qualification: useId(),
    field: useId(),
    location: useId(),
    start: useId(),
    end: useId(),
    status: useId(),
    grade: useId(),
    description: useId(),
    state: useId(),
    order: useId(),
    showGrade: useId(),
  }

  const set = <K extends keyof EducationForm>(key: K, value: EducationForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = () => {
    save.mutate(
      {
        id,
        values: {
          institution: form.institution.trim(),
          qualification: form.qualification.trim(),
          field_of_study: form.field_of_study.trim() || null,
          location: form.location.trim() || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: form.status,
          grade_label: form.grade_label.trim() || null,
          show_grade: form.show_grade,
          description: form.description.trim() || null,
          publication_state: form.publication_state,
          sort_order: form.sort_order,
        },
      },
      {
        onSuccess: () => {
          toast.success(id ? 'Saved' : 'Added', form.qualification)
          onDone()
        },
        onError: (cause) => toast.error("Couldn't save", cause),
      },
    )
  }

  return (
    <div className="border-accent/30 bg-surface mt-6 space-y-4 rounded-[--radius-lg] border p-5">
      <h2 className="text-primary font-medium">
        {id ? 'Edit qualification' : 'New qualification'}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.qualification} label="Qualification" required>
          <Input
            id={ids.qualification}
            value={form.qualification}
            onChange={(e) => set('qualification', e.target.value)}
          />
        </FormField>
        <FormField id={ids.institution} label="Institution" required>
          <Input
            id={ids.institution}
            value={form.institution}
            onChange={(e) => set('institution', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={ids.field} label="Field of study">
          <Input
            id={ids.field}
            value={form.field_of_study}
            onChange={(e) => set('field_of_study', e.target.value)}
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

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id={ids.start} label="Start date">
          <Input
            id={ids.start}
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
          />
        </FormField>
        <FormField id={ids.end} label="End date" hint="Or the expected date.">
          <Input
            id={ids.end}
            type="date"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
          />
        </FormField>
        <FormField
          id={ids.status}
          label="Status"
          hint={`Renders as "${formatEducationStatus(form.status, form.end_date || null)}".`}
        >
          <Select
            id={ids.status}
            value={form.status}
            onChange={(e) => set('status', e.target.value as EducationStatus)}
          >
            <option value="completed">Completed</option>
            <option value="in_progress">In progress</option>
            <option value="expected">Expected</option>
          </Select>
        </FormField>
      </div>

      <FormField
        id={ids.grade}
        label="Grade"
        hint="Free text, e.g. 70%. Stored either way; only shown if the switch below is on."
      >
        <Input
          id={ids.grade}
          value={form.grade_label}
          onChange={(e) => set('grade_label', e.target.value)}
        />
      </FormField>

      <div className="flex items-start gap-2.5">
        <input
          id={ids.showGrade}
          type="checkbox"
          checked={form.show_grade}
          onChange={(e) => set('show_grade', e.target.checked)}
          className="accent-accent mt-0.5 size-4"
        />
        <div>
          <label htmlFor={ids.showGrade} className="text-secondary text-sm font-medium">
            Show the grade publicly
          </label>
          <p className="text-muted text-xs">
            Q-18. For an audience of business clients and hiring managers, school percentages
            usually add nothing.
          </p>
        </div>
      </div>

      <FormField id={ids.description} label="Description">
        <Textarea
          id={ids.description}
          rows={3}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </FormField>

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
          disabled={form.qualification.trim() === '' || form.institution.trim() === ''}
          onClick={handleSave}
        >
          {id ? 'Save' : 'Add'}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
