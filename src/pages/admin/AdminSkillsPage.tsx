import { Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'

import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { EmptyState, ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField, Input } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useAdminSkills,
  useDeleteSkill,
  useDeleteSkillCategory,
  useSaveSkill,
  useSaveSkillCategory,
} from '@/hooks/useAdminContent'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/cn'
import { slugify } from '@/lib/slug'
import type { AdminSkillCategory } from '@/services/adminContent.service'

/**
 * Skills — PRD 20.2, 16.
 *
 * Categories and skills on one screen (20.2 asks for exactly that), because
 * they are never edited apart: adding a skill means choosing its category, and
 * a category with no skills renders nowhere.
 *
 * FR-SKILL-03 (P0) — there is no proficiency control here, and no column to
 * back one. `is_core` and sort order are the entire emphasis vocabulary. That
 * absence is asserted by `npm run db:verify` (AC-SKILL-3), so adding a slider
 * later would fail the suite rather than quietly shipping.
 *
 * `skill_categories -> skills` is ON DELETE RESTRICT, so deleting a category
 * that still holds skills is refused by the database. The UI explains that up
 * front instead of surfacing a foreign-key violation.
 */
export default function AdminSkillsPage() {
  const { data: categories, isPending, isError, error, refetch } = useAdminSkills()
  const [addingCategory, setAddingCategory] = useState(false)

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-primary text-2xl">Skills</h1>
          <p className="text-secondary mt-1 text-sm">
            Grouped by category. No proficiency ratings — ordering and the core flag are the only
            emphasis.
          </p>
        </div>
        <Button onClick={() => setAddingCategory(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add category
        </Button>
      </div>

      {addingCategory && (
        <CategoryEditor
          onDone={() => setAddingCategory(false)}
          nextSortOrder={(categories?.length ?? 0) * 10}
        />
      )}

      <div className="mt-6">
        {isPending ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-[--radius-lg]" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            title="No skill categories yet"
            description="Create a category first, then add skills to it."
            action={<Button onClick={() => setAddingCategory(true)}>Add category</Button>}
          />
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryCard({ category }: { category: AdminSkillCategory }) {
  const toast = useToast()
  const saveCategory = useSaveSkillCategory()
  const removeCategory = useDeleteSkillCategory()
  const [addingSkill, setAddingSkill] = useState(false)
  const [editing, setEditing] = useState(false)

  const hasSkills = category.skills.length > 0

  const togglePublished = () =>
    saveCategory.mutate(
      {
        id: category.id,
        values: {
          name: category.name,
          slug: category.slug,
          sort_order: category.sort_order,
          published: !category.published,
        },
      },
      {
        onSuccess: () =>
          toast.success(
            category.published ? 'Category hidden' : 'Category published',
            category.name,
          ),
        onError: (cause) => toast.error("Couldn't change the state", cause),
      },
    )

  return (
    <section className="border-subtle bg-surface rounded-[--radius-lg] border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-primary font-medium">{category.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={category.published ? 'success' : 'neutral'}>
              {category.published ? 'Published' : 'Hidden'}
            </Badge>
            <Badge tone="outline">
              {category.skills.length} skill{category.skills.length === 1 ? '' : 's'}
            </Badge>
            {/* FR-SKILL-06 — a category with no published skills renders
                nowhere, which is confusing unless it is said here. */}
            {category.published && !category.skills.some((s) => s.published) && (
              <Badge tone="warning">Nothing published inside — hidden on the site</Badge>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => setEditing((v) => !v)}>
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            loading={saveCategory.isPending}
            onClick={togglePublished}
          >
            {category.published ? 'Hide' : 'Publish'}
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                // RESTRICT: the database would refuse anyway. Disabling here
                // means the user learns why before the failure, not after.
                disabled={hasSkills}
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            }
            title="Delete this category?"
            recordName={category.name}
            onConfirm={() =>
              new Promise<void>((resolve) => {
                removeCategory.mutate(category.id, {
                  onSuccess: () => {
                    toast.success('Category deleted', category.name)
                    resolve()
                  },
                  onError: (cause) => {
                    toast.error("Couldn't delete the category", cause)
                    resolve()
                  },
                })
              })
            }
          />
        </div>
      </div>

      {hasSkills && (
        <p className="text-muted mt-2 text-xs">
          Delete or move its skills before this category can be removed.
        </p>
      )}

      {editing && (
        <CategoryEditor
          category={category}
          onDone={() => setEditing(false)}
          nextSortOrder={category.sort_order}
        />
      )}

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {category.skills.map((skill) => (
          <li key={skill.id}>
            <SkillChip skill={skill} />
          </li>
        ))}
      </ul>

      {addingSkill ? (
        <SkillEditor
          categoryId={category.id}
          nextSortOrder={category.skills.length * 10}
          onDone={() => setAddingSkill(false)}
        />
      ) : (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setAddingSkill(true)}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add skill
        </Button>
      )}
    </section>
  )
}

function SkillChip({ skill }: { skill: AdminSkillCategory['skills'][number] }) {
  const toast = useToast()
  const save = useSaveSkill()
  const remove = useDeleteSkill()

  const patch = (values: Partial<{ is_core: boolean; published: boolean }>) =>
    save.mutate(
      {
        id: skill.id,
        values: {
          category_id: skill.category_id,
          name: skill.name,
          slug: skill.slug,
          is_core: values.is_core ?? skill.is_core,
          published: values.published ?? skill.published,
          sort_order: skill.sort_order,
        },
      },
      { onError: (cause) => toast.error("Couldn't update the skill", cause) },
    )

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[--radius-sm] border px-2 py-1',
        skill.published ? 'border-subtle' : 'border-subtle/50 opacity-50',
        skill.is_core && skill.published && 'border-accent/30 bg-accent-soft',
      )}
    >
      <span className="text-primary font-mono text-xs">{skill.name}</span>

      {/* `is_core` is the only emphasis mechanism that exists (FR-SKILL-03). */}
      <button
        type="button"
        aria-pressed={skill.is_core}
        onClick={() => patch({ is_core: !skill.is_core })}
        title={skill.is_core ? 'Core skill' : 'Mark as core'}
        className={cn('text-xs', skill.is_core ? 'text-accent' : 'text-muted hover:text-secondary')}
      >
        ★<span className="visually-hidden">{skill.is_core ? 'Unmark' : 'Mark'} as core</span>
      </button>

      <button
        type="button"
        onClick={() => patch({ published: !skill.published })}
        title={skill.published ? 'Published' : 'Hidden'}
        className="text-muted hover:text-secondary text-xs"
      >
        {skill.published ? '👁' : '⃠'}
        <span className="visually-hidden">
          {skill.published ? 'Hide' : 'Publish'} {skill.name}
        </span>
      </button>

      <ConfirmDialog
        trigger={
          <button
            type="button"
            className="text-muted hover:text-danger"
            aria-label={`Delete ${skill.name}`}
          >
            <Trash2 className="size-3" aria-hidden="true" />
          </button>
        }
        title="Delete this skill?"
        recordName={skill.name}
        onConfirm={() =>
          new Promise<void>((resolve) => {
            remove.mutate(skill.id, {
              onSuccess: () => {
                toast.success('Skill deleted', skill.name)
                resolve()
              },
              onError: (cause) => {
                toast.error("Couldn't delete the skill", cause)
                resolve()
              },
            })
          })
        }
      />
    </span>
  )
}

function CategoryEditor({
  category,
  nextSortOrder,
  onDone,
}: {
  category?: AdminSkillCategory
  nextSortOrder: number
  onDone: () => void
}) {
  const toast = useToast()
  const save = useSaveSkillCategory()
  const [name, setName] = useState(category?.name ?? '')
  const id = useId()

  const handleSave = () =>
    save.mutate(
      {
        id: category?.id,
        values: {
          name: name.trim(),
          slug: category?.slug ?? slugify(name),
          sort_order: category?.sort_order ?? nextSortOrder,
          published: category?.published ?? true,
        },
      },
      {
        onSuccess: () => {
          toast.success(category ? 'Category renamed' : 'Category added', name)
          onDone()
        },
        onError: (cause) => toast.error("Couldn't save the category", cause),
      },
    )

  return (
    <div className="border-accent/30 bg-base mt-4 space-y-3 rounded-[--radius-md] border p-4">
      <FormField id={id} label="Category name" required>
        <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={save.isPending}
          disabled={name.trim() === ''}
          onClick={handleSave}
        >
          {category ? 'Save' : 'Add category'}
        </Button>
        <Button size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function SkillEditor({
  categoryId,
  nextSortOrder,
  onDone,
}: {
  categoryId: string
  nextSortOrder: number
  onDone: () => void
}) {
  const toast = useToast()
  const save = useSaveSkill()
  const [name, setName] = useState('')
  const [isCore, setIsCore] = useState(false)
  const nameId = useId()
  const coreId = useId()

  const handleSave = () =>
    save.mutate(
      {
        values: {
          category_id: categoryId,
          name: name.trim(),
          slug: slugify(name),
          is_core: isCore,
          published: true,
          sort_order: nextSortOrder,
        },
      },
      {
        onSuccess: () => {
          toast.success('Skill added', name)
          setName('')
          setIsCore(false)
          // The editor stays open: adding skills is a batch activity, and
          // reopening the form for each one is needless friction.
        },
        onError: (cause) => toast.error("Couldn't add the skill", cause),
      },
    )

  return (
    <div className="border-accent/30 bg-base mt-3 space-y-3 rounded-[--radius-md] border p-4">
      <FormField id={nameId} label="Skill name" required>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim() !== '') handleSave()
          }}
        />
      </FormField>
      <div className="flex items-center gap-2">
        <input
          id={coreId}
          type="checkbox"
          checked={isCore}
          onChange={(e) => setIsCore(e.target.checked)}
          className="accent-accent size-4"
        />
        <label htmlFor={coreId} className="text-secondary text-sm">
          Core skill — shown with a stronger chip
        </label>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={save.isPending}
          disabled={name.trim() === ''}
          onClick={handleSave}
        >
          Add skill
        </Button>
        <Button size="sm" variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
