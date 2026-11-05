import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Hash, Plus, Tag as TagIcon, Trash2 } from 'lucide-react'
import { ConfirmDialog, Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { Button, EmptyState, Field, Input, Skeleton } from '@/components/ui'
import { useTags } from '@/hooks/useCatalog'
import { createTag, deleteTag } from '@/lib/api'
import { friendlyError } from '@/lib/supabase'
import { fieldErrors, tagSchema, type FieldErrors } from '@/lib/validation'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'

const SUGGESTIONS = ['work', 'personal', 'study', 'ideas', 'important']

export function TagsPage() {
  const { tags, loading, error } = useTags()
  const { bump } = useData()
  const toast = useToast()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)

  const openCreate = (preset = '') => {
    setName(preset)
    setErrors({})
    setServerError(null)
    setCreateOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = tagSchema.safeParse({ name })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (tags.some((t) => t.name.toLowerCase() === parsed.data.name.toLowerCase())) {
      setErrors({ name: 'That tag already exists — open it instead.' })
      return
    }
    setBusy(true)
    try {
      await createTag(parsed.data.name)
      bump()
      toast.success(`Tag #${parsed.data.name.toLowerCase()} created`)
      setCreateOpen(false)
    } catch (err) {
      const msg = friendlyError(err)
      setServerError(msg.includes('already in use') ? 'That tag already exists.' : msg)
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setBusy(true)
    try {
      await deleteTag(pendingDelete.id)
      bump()
      toast.success('Tag removed from your account')
      setPendingDelete(null)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const missingSuggestions = SUGGESTIONS.filter(
    (s) => !tags.some((t) => t.name.toLowerCase() === s),
  )

  return (
    <>
      <PageHeader
        title="Tags"
        description="Labels you can attach to notes and filter by — try work, study or ideas."
        actions={
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" aria-hidden />
            New Tag
          </Button>
        }
      />

      {error && (
        <div className="card border-red-200 p-6 text-center dark:border-red-900/50">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-wrap gap-2.5" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24" />
          ))}
        </div>
      )}

      {!loading && tags.length === 0 && (
        <EmptyState
          icon={<TagIcon className="h-6 w-6" aria-hidden />}
          title="No tags yet"
          description="Create your first tag, or start with a common one below."
          action={<Button onClick={() => openCreate()}>Create a tag</Button>}
          secondaryAction={
            missingSuggestions.length > 0 ? (
              <Button variant="secondary" onClick={() => openCreate(missingSuggestions[0])}>
                Try “{missingSuggestions[0]}”
              </Button>
            ) : undefined
          }
        />
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="card inline-flex items-center gap-1 py-1.5 pr-1.5 pl-3 transition hover:shadow-raised"
            >
              <Link
                to={`/app/tags/${tag.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300"
              >
                <Hash className="h-3.5 w-3.5" aria-hidden />
                {tag.name}
              </Link>
              <button
                type="button"
                onClick={() => setPendingDelete({ id: tag.id, name: tag.name })}
                aria-label={`Delete tag ${tag.name}`}
                className="ml-1 rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/60"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      {!loading && tags.length > 0 && missingSuggestions.length > 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Suggested tags</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {missingSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void createTag(s).then(() => { bump(); toast.success(`Tag #${s} created`) }).catch((e: unknown) => toast.error(friendlyError(e)))}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-300"
              >
                <Plus className="h-3 w-3" aria-hidden /> {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create tag dialog */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create a tag"
        description="Tags are short labels — letters and numbers work best."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="tag-form" loading={busy}>
              Create tag
            </Button>
          </>
        }
      >
        <form id="tag-form" onSubmit={submit} className="space-y-4">
          {serverError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {serverError}
            </p>
          )}
          <Field label="Tag name" htmlFor="tag-name" required error={errors.name}>
            <Input
              id="tag-name"
              autoFocus
              maxLength={24}
              placeholder="e.g. study"
              value={name}
              invalid={Boolean(errors.name)}
              onChange={(e) => {
                setName(e.target.value)
                setErrors({})
              }}
            />
          </Field>
        </form>
      </Modal>

      {/* Delete tag confirmation — notes are kept, only the label is removed */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        loading={busy}
        title="Delete this tag?"
        message={
          pendingDelete ? (
            <>
              <strong>#{pendingDelete.name}</strong> will be removed from all of your notes. The
              notes themselves are not deleted.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete tag"
        danger
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
