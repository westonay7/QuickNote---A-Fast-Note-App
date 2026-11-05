import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FolderOpen, FolderPlus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { Menu } from '@/components/Menu'
import { PageHeader } from '@/components/PageHeader'
import { Button, EmptyState, Field, Input, Select, Skeleton } from '@/components/ui'
import { useFolders } from '@/hooks/useCatalog'
import { createFolder, deleteFolder, renameFolder } from '@/lib/api'
import { friendlyError } from '@/lib/supabase'
import { relativeTime } from '@/lib/format'
import { folderSchema, fieldErrors, type FieldErrors } from '@/lib/validation'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'

type DialogState =
  | { kind: 'create' }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; id: string; name: string }
  | null

export function FoldersPage() {
  const { folders, loading, error } = useFolders()
  const { bump } = useData()
  const toast = useToast()
  const navigate = useNavigate()

  const [dialog, setDialog] = useState<DialogState>(null)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Delete-dialog note destination (safe behavior: notes are NEVER destroyed)
  const [moveTarget, setMoveTarget] = useState<string>('__none__')

  const openCreate = () => {
    setName('')
    setErrors({})
    setServerError(null)
    setDialog({ kind: 'create' })
  }

  const openRename = (id: string, current: string) => {
    setName(current)
    setErrors({})
    setServerError(null)
    setDialog({ kind: 'rename', id, name: current })
  }

  const openDelete = (id: string, current: string) => {
    setMoveTarget('__none__')
    setServerError(null)
    setDialog({ kind: 'delete', id, name: current })
  }

  const duplicate = useMemo(
    () => (value: string) => folders.some((f) => f.name.toLowerCase() === value.trim().toLowerCase()),
    [folders],
  )

  const submitName = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = folderSchema.safeParse({ name })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    if (duplicate(parsed.data.name)) {
      setErrors({ name: 'A folder with this name already exists.' })
      return
    }
    setBusy(true)
    try {
      if (dialog?.kind === 'create') {
        await createFolder(parsed.data.name)
        toast.success('Folder created')
      } else if (dialog?.kind === 'rename') {
        await renameFolder(dialog.id, parsed.data.name)
        toast.success('Folder renamed')
      }
      bump()
      setDialog(null)
    } catch (err) {
      const msg = friendlyError(err)
      setServerError(
        msg.includes('already in use') ? 'A folder with this name already exists.' : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (dialog?.kind !== 'delete') return
    setBusy(true)
    try {
      await deleteFolder(dialog.id, moveTarget === '__none__' ? null : moveTarget)
      bump()
      toast.success(`Folder deleted — its notes were kept`)
      setDialog(null)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const otherFolders = folders.filter((f) => f.id !== (dialog?.kind === 'delete' ? dialog.id : ''))

  return (
    <>
      <PageHeader
        title="Folders"
        description="Group related notes together. Deleting a folder never deletes its notes."
        actions={
          <Button onClick={openCreate}>
            <FolderPlus className="h-4 w-4" aria-hidden />
            New Folder
          </Button>
        }
      />

      {error && (
        <div className="card border-red-200 p-6 text-center dark:border-red-900/50">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {!loading && folders.length === 0 && (
        <EmptyState
          icon={<FolderPlus className="h-6 w-6" aria-hidden />}
          title="No folders yet"
          description="Create your first folder — for example Work, Study or Personal — to start grouping notes."
          action={<Button onClick={openCreate}>Create a folder</Button>}
        />
      )}

      {folders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <div key={folder.id} className="card group relative p-4 transition-shadow hover:shadow-raised">
              <Link
                to={`/app/folders/${folder.id}`}
                className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                aria-label={`Open folder ${folder.name}`}
              />
              <div className="pointer-events-none relative flex items-start justify-between gap-2 [&_button]:pointer-events-auto">
                <div className="min-w-0">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
                    <FolderOpen className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="truncate font-semibold text-zinc-900 dark:text-zinc-100" title={folder.name}>
                    {folder.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {folder.note_count ?? 0} note{(folder.note_count ?? 0) === 1 ? '' : 's'} · updated{' '}
                    {relativeTime(folder.updated_at)}
                  </p>
                </div>
                <Menu
                  label={`Actions for ${folder.name}`}
                  items={[
                    { label: 'Open folder', icon: <FolderOpen className="h-4 w-4" />, onSelect: () => navigate(`/app/folders/${folder.id}`) },
                    {
                      label: 'Rename',
                      icon: <Pencil className="h-4 w-4" />,
                      onSelect: () => openRename(folder.id, folder.name),
                    },
                    {
                      label: 'Delete folder',
                      icon: <Trash2 className="h-4 w-4" />,
                      danger: true,
                      onSelect: () => openDelete(folder.id, folder.name),
                    },
                  ]}
                  trigger={(props) => (
                    <button
                      {...props}
                      type="button"
                      aria-label={`Actions for ${folder.name}`}
                      className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / rename dialog */}
      <Modal
        open={dialog?.kind === 'create' || dialog?.kind === 'rename'}
        onClose={() => setDialog(null)}
        title={dialog?.kind === 'rename' ? 'Rename folder' : 'Create a folder'}
        description={
          dialog?.kind === 'rename'
            ? 'Give this folder a clear, unique name.'
            : 'Folders keep related notes together. Names must be unique.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form="folder-name-form" loading={busy}>
              {dialog?.kind === 'rename' ? 'Save changes' : 'Create folder'}
            </Button>
          </>
        }
      >
        <form id="folder-name-form" onSubmit={submitName} className="space-y-4">
          {serverError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {serverError}
            </p>
          )}
          <Field label="Folder name" htmlFor="folder-name" required error={errors.name}>
            <Input
              id="folder-name"
              autoFocus
              maxLength={40}
              placeholder="e.g. Work, Study, Personal"
              value={name}
              invalid={Boolean(errors.name)}
              onChange={(e) => {
                setName(e.target.value)
                setErrors({})
              }}
            />
          </Field>
          {/* Enter submits without a visible button */}
          <button type="submit" className="sr-only">
            Submit
          </button>
        </form>
      </Modal>

      {/* Delete dialog — safe note handling */}
      <Modal
        open={dialog?.kind === 'delete'}
        onClose={() => setDialog(null)}
        title="Delete folder?"
        description={
          dialog?.kind === 'delete'
            ? `“${dialog.name}” will be removed. Its notes are never deleted with it — choose where they should go.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={busy}>
              Delete folder
            </Button>
          </>
        }
      >
        <fieldset className="space-y-3 pb-1">
          <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Keep this folder's notes:
          </legend>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
              moveTarget === '__none__'
                ? 'border-brand-400 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-950/50'
                : 'border-zinc-200 hover:border-zinc-300 dark:border-white/10'
            }`}
          >
            <input
              type="radio"
              name="delete-target"
              checked={moveTarget === '__none__'}
              onChange={() => setMoveTarget('__none__')}
              className="mt-0.5 accent-[#4f46e5]"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              <strong className="block font-medium text-zinc-900 dark:text-zinc-100">Move to Uncategorized</strong>
              They stay in All Notes without a folder.
            </span>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
              moveTarget !== '__none__'
                ? 'border-brand-400 bg-brand-50/60 dark:border-brand-700 dark:bg-brand-950/50'
                : 'border-zinc-200 hover:border-zinc-300 dark:border-white/10'
            }`}
          >
            <input
              type="radio"
              name="delete-target"
              checked={moveTarget !== '__none__'}
              onChange={() => setMoveTarget(otherFolders[0]?.id ?? '__none__')}
              className="mt-0.5 accent-[#4f46e5]"
            />
            <span className="w-full text-sm text-zinc-700 dark:text-zinc-300">
              <strong className="block font-medium text-zinc-900 dark:text-zinc-100">Move to another folder</strong>
              <Select
                aria-label="Destination folder"
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
                disabled={moveTarget === '__none__' || otherFolders.length === 0}
                className="mt-2 h-9 text-sm"
              >
                <option value="__none__">
                  {otherFolders.length === 0 ? 'No other folders available' : 'Choose a folder…'}
                </option>
                {otherFolders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              {otherFolders.length === 0 && (
                <span className="mt-1 block text-xs text-zinc-400">
                  Create another folder first, or move notes to Uncategorized.
                </span>
              )}
            </span>
          </label>
        </fieldset>
      </Modal>
    </>
  )
}
