import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  FileText,
  FolderOpen,
  FolderPlus,
  PencilLine,
  Pin,
  Plus,
  RefreshCw,
  Star,
} from 'lucide-react'
import { ConfirmDialog } from '@/components/Modal'
import { NoteCard } from '@/components/NoteCard'
import { PageHeader } from '@/components/PageHeader'
import { Button, EmptyState, NoteCardSkeleton, Skeleton } from '@/components/ui'
import { useNoteActions } from '@/hooks/useNoteActions'
import { useFolders } from '@/hooks/useCatalog'
import { useNotesList } from '@/hooks/useNotesList'
import { fetchDashboardCounts, type DashboardCounts } from '@/lib/api'
import { friendlyError } from '@/lib/supabase'
import { cn, relativeTime } from '@/lib/format'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { usePrefs } from '@/state/PrefsContext'

function SummaryCard({
  to,
  icon,
  label,
  value,
  loading,
  tone = 'brand',
}: {
  to: string
  icon: ReactNode
  label: string
  value: number
  loading: boolean
  tone?: 'brand' | 'amber' | 'violet' | 'emerald'
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300',
  }
  return (
    <Link
      to={to}
      className="card group flex items-center gap-4 p-4 transition-shadow hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
          {loading ? '—' : value}
        </span>
        <span className="block truncate text-xs font-medium text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200">
          {label}
        </span>
      </span>
    </Link>
  )
}

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200 sm:text-base">
        {title}
      </h2>
      {href && (
        <Link
          to={href}
          className="text-xs font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400"
        >
          {linkLabel ?? 'View all'}
        </Link>
      )}
    </div>
  )
}

export function Dashboard() {
  const { profile } = useAuth()
  const { prefs } = usePrefs()
  const { version, bump } = useData()
  const actions = useNoteActions()

  const [counts, setCounts] = useState<DashboardCounts | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [countsLoading, setCountsLoading] = useState(true)

  const { folders, loading: foldersLoading } = useFolders()
  const all = useNotesList('all', { sort: 'updated_desc' })
  const pinned = useNotesList('pinned', { sort: 'updated_desc' })

  useEffect(() => {
    let cancelled = false
    setCountsLoading(true)
    setCountsError(null)
    fetchDashboardCounts()
      .then((c) => !cancelled && setCounts(c))
      .catch((err: unknown) => !cancelled && setCountsError(friendlyError(err)))
      .finally(() => !cancelled && setCountsLoading(false))
    return () => {
      cancelled = true
    }
  }, [version])

  const firstName = (profile?.full_name ?? '').trim().split(/\s+/)[0] || ''
  const now = new Date()
  const dateLine = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const grid = cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4')

  // "Recent" = notes you actually opened/edited lately, by last access time
  const recentNotes = useMemo(() => {
    return [...all.notes]
      .sort((a, b) => {
        const aKey = a.last_opened_at ?? a.updated_at
        const bKey = b.last_opened_at ?? b.updated_at
        return bKey.localeCompare(aKey)
      })
      .slice(0, 6)
  }, [all.notes])

  const updatedNotes = useMemo(() => all.notes.slice(0, 6), [all.notes])
  const pinnedNotes = useMemo(() => pinned.notes.filter((n) => n.is_pinned).slice(0, 6), [pinned.notes])
  const quickFolders = useMemo(() => folders.slice(0, 6), [folders])

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}
        description={`${dateLine} · ${countsError ? 'Counts unavailable' : 'Here is the state of your notes.'}`}
        actions={
          <Link
            to="/app/notes/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <PencilLine className="h-4 w-4" aria-hidden />
            Create New Note
          </Link>
        }
      />

      {countsError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200">
          <span>{countsError}</span>
          <Button size="sm" variant="secondary" onClick={() => bump()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
          </Button>
        </div>
      )}

      {/* Summary cards — numbers come from real database counts */}
      <div className={grid}>
        <SummaryCard to="/app/notes" icon={<FileText className="h-5 w-5" aria-hidden />} label="Active notes" value={counts?.active ?? 0} loading={countsLoading} />
        <SummaryCard to="/app/pinned" icon={<Pin className="h-5 w-5" aria-hidden />} label="Pinned notes" value={counts?.pinned ?? 0} loading={countsLoading} tone="violet" />
        <SummaryCard to="/app/favorites" icon={<Star className="h-5 w-5" aria-hidden />} label="Favorites" value={counts?.favorite ?? 0} loading={countsLoading} tone="amber" />
        <SummaryCard to="/app/folders" icon={<FolderOpen className="h-5 w-5" aria-hidden />} label="Folders" value={counts?.folders ?? 0} loading={countsLoading} tone="emerald" />
      </div>

      {/* Pinned */}
      {pinnedNotes.length > 0 && (
        <section className="mt-9">
          <SectionHeader title="Pinned Notes" href="/app/pinned" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                compact={prefs.density === 'compact'}
                onTogglePin={actions.togglePin}
                onToggleFavorite={actions.toggleFavorite}
                onArchive={actions.archive}
                onTrash={actions.trash}
                onCopy={actions.copy}
                onExport={actions.exportMd}
                onReadAloud={actions.readAloud}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent notes */}
      <section className="mt-9">
        <SectionHeader title="Recent Notes" href="/app/recent" linkLabel="View all recent" />
        {all.loading ? (
          <NoteCardSkeleton count={4} />
        ) : recentNotes.length === 0 ? (
          <EmptyState
            compact
            icon={<Clock className="h-6 w-6" aria-hidden />}
            title="No notes yet"
            description="Notes you open or edit will show up here for quick access."
            action={
              <Link
                to="/app/notes/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" aria-hidden /> Create your first note
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {recentNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                compact={prefs.density === 'compact'}
                onTogglePin={actions.togglePin}
                onToggleFavorite={actions.toggleFavorite}
                onArchive={actions.archive}
                onTrash={actions.trash}
                onCopy={actions.copy}
                onExport={actions.exportMd}
                onReadAloud={actions.readAloud}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recently updated */}
      <section className="mt-9">
        <SectionHeader title="Recently Updated" href="/app/notes" />
        {all.loading ? (
          <NoteCardSkeleton count={4} />
        ) : updatedNotes.length === 0 ? (
          <EmptyState
            compact
            icon={<RefreshCw className="h-6 w-6" aria-hidden />}
            title="Nothing updated yet"
            description="Your latest edits appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {updatedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                compact={prefs.density === 'compact'}
                onTogglePin={actions.togglePin}
                onToggleFavorite={actions.toggleFavorite}
                onArchive={actions.archive}
                onTrash={actions.trash}
                onCopy={actions.copy}
                onExport={actions.exportMd}
                onReadAloud={actions.readAloud}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick-access folders */}
      <section className="mt-9 mb-4">
        <SectionHeader title="Folders" href="/app/folders" linkLabel="Manage folders" />
        {foldersLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : quickFolders.length === 0 ? (
          <EmptyState
            compact
            icon={<FolderPlus className="h-6 w-6" aria-hidden />}
            title="No folders yet"
            description="Group related notes into folders to keep your workspace tidy."
            action={
              <Link
                to="/app/folders"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                <FolderPlus className="h-4 w-4" aria-hidden /> Create a folder
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {quickFolders.map((folder) => (
              <Link
                key={folder.id}
                to={`/app/folders/${folder.id}`}
                className="card group flex items-center gap-3 p-4 transition-shadow hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition group-hover:bg-brand-100 dark:bg-brand-950/70 dark:text-brand-300">
                  <FolderOpen className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {folder.name}
                  </span>
                  <span className="block text-xs text-zinc-400">
                    {folder.note_count ?? 0} note{(folder.note_count ?? 0) === 1 ? '' : 's'} · updated{' '}
                    {relativeTime(folder.updated_at)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

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

      {/* Screen-reader announcement for live counts */}
      <p className="sr-only" aria-live="polite">
        {countsLoading ? 'Loading dashboard counts' : `${counts?.active ?? 0} active notes`}
      </p>
    </>
  )
}
