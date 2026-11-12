import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Archive,
  Clock,
  FileText,
  FolderOpen,
  Pin,
  Plus,
  Search,
  SortAsc,
  Star,
  Tags,
  Trash2,
  X,
} from 'lucide-react'
import { ConfirmDialog } from './Modal'
import { NoteCard } from './NoteCard'
import { PageHeader } from './PageHeader'
import { Button, EmptyState, NoteCardSkeleton, SegmentedControl, Select } from './ui'
import { useNoteActions } from '@/hooks/useNoteActions'
import { useNotesList } from '@/hooks/useNotesList'
import { cn } from '@/lib/format'
import { emptyTrash } from '@/lib/api'
import { friendlyError } from '@/lib/supabase'
import type { NoteScope, SortKey, ViewMode } from '@/lib/types'
import { useData } from '@/state/DataContext'
import { usePrefs } from '@/state/PrefsContext'
import { useToast } from '@/state/ToastContext'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'created_desc', label: 'Recently created' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
]

const SCOPE_META: Record<
  NoteScope,
  {
    title: string
    description: string
    icon: typeof FileText
    emptyTitle: string
    emptyDescription: string
  }
> = {
  all: {
    title: 'All Notes',
    description: 'A complete directory of all notes you have created.',
    icon: FileText,
    emptyTitle: 'No notes created yet',
    emptyDescription: 'All notes you create in QuickNote will be listed here.',
  },
  pinned: {
    title: 'Pinned Notes',
    description: 'Your pinned notes stay easy to reach.',
    icon: Pin,
    emptyTitle: 'Nothing pinned yet',
    emptyDescription: 'Pin a note from its card or editor to keep it easy to reach.',
  },
  favorites: {
    title: 'Favorites',
    description: 'Notes you have marked with a star.',
    icon: Star,
    emptyTitle: 'No favorites yet',
    emptyDescription: 'Mark important notes as favorites to find them fast.',
  },
  recent: {
    title: 'Recent Notes',
    description: 'Notes you have updated most recently. “Recent” means updated in the last 30 days.',
    icon: Clock,
    emptyTitle: 'No recent activity',
    emptyDescription: 'Open or edit a note and it will show up here.',
  },
  archived: {
    title: 'Archived Notes',
    description: 'Archived notes are hidden from All Notes until you restore them.',
    icon: Archive,
    emptyTitle: 'No archived notes',
    emptyDescription: 'Archive notes you do not need in your main workspace — they stay safe here.',
  },
  trash: {
    title: 'Trash',
    description: 'Deleted notes stay here until you restore or permanently delete them.',
    icon: Trash2,
    emptyTitle: 'Trash is empty',
    emptyDescription: 'Notes you delete are kept here so you can recover them.',
  },
  folder: {
    title: 'Folder',
    description: '',
    icon: FolderOpen,
    emptyTitle: 'This folder is empty',
    emptyDescription: 'Move a note into this folder or create a new one.',
  },
  tag: {
    title: 'Tag',
    description: '',
    icon: Tags,
    emptyTitle: 'No notes with this tag',
    emptyDescription: 'Add this tag to a note to see it here.',
  },
}

const LINK_BTN =
  'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

interface NotesViewProps {
  scope: NoteScope
  folderId?: string | null
  tagId?: string | null
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
  showCreate?: boolean
  extraActions?: ReactNode
}

export function NotesView({
  scope,
  folderId = null,
  tagId = null,
  title,
  description,
  emptyTitle,
  emptyDescription,
  showCreate = true,
  extraActions,
}: NotesViewProps) {
  const meta = SCOPE_META[scope]
  const { prefs, update } = usePrefs()
  const toast = useToast()
  const { bump } = useData()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<ViewMode>(prefs.defaultView)
  const [emptying, setEmptying] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

  const sortParam = params.get('sort') as SortKey | null
  const sort: SortKey =
    sortParam && SORT_OPTIONS.some((o) => o.value === sortParam) ? sortParam : prefs.defaultSort

  const listScope = scope === 'folder' || scope === 'tag' ? 'all' : scope
  const { notes, loading, error, hasMore, reload, loadMore } = useNotesList(listScope, {
    sort,
    folderId,
    tagId,
  })

  const actions = useNoteActions()

  const setSort = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('sort', value)
    setParams(next, { replace: true })
  }

  const filteredNotes = useMemo(() => {
    let list = notes
    if (scope === 'folder') list = list.filter((n) => n.folder_id === folderId)
    if (scope === 'tag') list = list.filter((n) => n.tags.some((t) => t.id === tagId))
    if (scope === 'pinned') list = [...list].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
    if (scope === 'recent') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      list = list.filter((n) => new Date(n.updated_at).getTime() >= cutoff)
    }
    if (filterQuery.trim()) {
      const q = filterQuery.trim().toLowerCase()
      list = list.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          (n.content && n.content.toLowerCase().includes(q)) ||
          (n.folder_name && n.folder_name.toLowerCase().includes(q)) ||
          n.tags.some((t) => t.name.toLowerCase().includes(q)),
      )
    }
    return list
  }, [notes, scope, folderId, tagId, filterQuery])

  const doEmptyTrash = async () => {
    setEmptying(true)
    try {
      await emptyTrash()
      bump()
      toast.success('Trash emptied')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setEmptying(false)
    }
  }

  const ScopeIcon = meta.icon
  const allowCreate = showCreate && scope !== 'trash' && scope !== 'all'

  return (
    <>
      <PageHeader
        title={title ?? meta.title}
        description={description ?? meta.description}
        actions={
          <>
            {extraActions}
            {scope === 'trash' && notes.length > 0 && (
              <Button variant="danger" loading={emptying} onClick={() => void doEmptyTrash()}>
                Empty Trash
              </Button>
            )}
            {allowCreate && (
              <Link
                to="/app/notes/new"
                className={`${LINK_BTN} bg-brand-600 text-white shadow-soft hover:bg-brand-700`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New Note
              </Link>
            )}
          </>
        }
      />

      {/* Toolbar: result count + instant filter + sort + view */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {loading
            ? 'Loading notes…'
            : filterQuery.trim()
              ? `Showing ${filteredNotes.length} of ${notes.length} note${notes.length === 1 ? '' : 's'}`
              : `${filteredNotes.length} note${filteredNotes.length === 1 ? '' : 's'}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {notes.length > 0 && (
            <div className="relative">
              <Search
                className="pointer-events-none absolute inset-y-0 left-2.5 my-auto h-3.5 w-3.5 text-zinc-400"
                aria-hidden
              />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter notes…"
                className="h-9 w-36 sm:w-44 rounded-lg border border-zinc-200 bg-white pl-8 pr-7 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-surface-dark dark:text-zinc-100"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear filter"
                  className="absolute inset-y-0 right-2 my-auto h-4 w-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <label htmlFor={`sort-${scope}`} className="sr-only">
            Sort notes
          </label>
          <div className="relative">
            <SortAsc
              className="pointer-events-none absolute inset-y-0 left-2.5 my-auto h-4 w-4 text-zinc-400"
              aria-hidden
            />
            <Select
              id={`sort-${scope}`}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-9 w-40 sm:w-44 pl-8 text-xs sm:text-sm"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <SegmentedControl<ViewMode>
            ariaLabel="Note view"
            value={view}
            onChange={(v) => {
              setView(v)
              update({ defaultView: v })
            }}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="card border-red-200 p-6 text-center dark:border-red-900/50">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={reload}>
            Try again
          </Button>
        </div>
      )}

      {loading && notes.length === 0 && !error && <NoteCardSkeleton />}

      {!loading && !error && filteredNotes.length === 0 && (
        <EmptyState
          icon={filterQuery ? <Search className="h-6 w-6" aria-hidden /> : <ScopeIcon className="h-6 w-6" aria-hidden />}
          title={filterQuery ? 'No notes matched your filter' : emptyTitle ?? meta.emptyTitle}
          description={
            filterQuery
              ? `No notes matched "${filterQuery}". Try clearing the filter to see all your notes.`
              : emptyDescription ?? meta.emptyDescription
          }
          action={
            filterQuery ? (
              <Button variant="secondary" onClick={() => setFilterQuery('')}>
                Clear filter
              </Button>
            ) : allowCreate ? (
              <Link to="/app/notes/new" className={`${LINK_BTN} bg-brand-600 text-white shadow-soft hover:bg-brand-700`}>
                <Plus className="h-4 w-4" aria-hidden /> Create a note
              </Link>
            ) : undefined
          }
        />
      )}

      {filteredNotes.length > 0 && (
        <div
          className={cn(
            view === 'grid'
              ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
              : 'flex flex-col gap-2.5',
          )}
        >
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              view={view}
              compact={prefs.density === 'compact'}
              onTogglePin={scope === 'trash' ? undefined : actions.togglePin}
              onToggleFavorite={scope === 'trash' ? undefined : actions.toggleFavorite}
              onArchive={scope === 'trash' ? undefined : actions.archive}
              onRestore={scope === 'trash' ? actions.restore : undefined}
              onTrash={scope === 'trash' ? undefined : actions.trash}
              onDeleteForever={scope === 'trash' ? actions.deleteForever : undefined}
              onCopy={actions.copy}
              onExport={actions.exportMd}
              onReadAloud={actions.readAloud}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" onClick={loadMore}>
            Load more notes
          </Button>
        </div>
      )}

      {actions.confirm && (
        <ConfirmDialog
          open
          loading={actions.confirmBusy}
          title={actions.confirm.title}
          message={actions.confirm.message}
          confirmLabel={actions.confirm.confirmLabel}
          danger={actions.confirm.danger}
          onConfirm={actions.confirm.onConfirm}
          onClose={actions.dismissConfirm}
        />
      )}
    </>
  )
}
