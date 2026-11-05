import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SearchX, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/Modal'
import { NoteCard } from '@/components/NoteCard'
import { PageHeader } from '@/components/PageHeader'
import { Button, NoteCardSkeleton } from '@/components/ui'
import { useNoteActions } from '@/hooks/useNoteActions'
import { searchNotes } from '@/lib/api'
import { friendlyError } from '@/lib/supabase'
import type { NoteWithRefs } from '@/lib/types'

const MIN_QUERY = 2
const DEBOUNCE_MS = 350

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [input, setInput] = useState(urlQuery)
  const [results, setResults] = useState<NoteWithRefs[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const reqIdRef = useRef(0)
  const actions = useNoteActions()

  // Debounced, database-backed search across title, body, tags and folders
  useEffect(() => {
    const term = input.trim()
    const timer = window.setTimeout(async () => {
      const next = new URLSearchParams(params)
      if (term) next.set('q', term)
      else next.delete('q')
      setParams(next, { replace: true })

      if (term.length < MIN_QUERY) {
        setResults([])
        setSearched(false)
        setLoading(false)
        setError(null)
        return
      }
      const reqId = ++reqIdRef.current
      setLoading(true)
      setError(null)
      try {
        const found = await searchNotes(term)
        if (reqId !== reqIdRef.current) return
        setResults(found)
        setSearched(true)
      } catch (err) {
        if (reqId !== reqIdRef.current) return
        setError(friendlyError(err))
        setResults([])
        setSearched(true)
      } finally {
        if (reqId === reqIdRef.current) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [input, attempt])

  // Pick up ?q= changes from the header search box
  useEffect(() => {
    setInput(urlQuery)
    // eslint-disable-next-line
  }, [urlQuery])

  const clear = () => {
    setInput('')
    setResults([])
    setSearched(false)
    setError(null)
    const next = new URLSearchParams(params)
    next.delete('q')
    setParams(next, { replace: true })
  }

  const onSubmit = (e: FormEvent) => e.preventDefault()

  const term = input.trim()

  return (
    <>
      <PageHeader
        title="Search"
        description="Looks through note titles, body text, tags and folder names — across all your active notes."
        actions={
          term ? (
            <Button variant="secondary" onClick={clear}>
              <X className="h-4 w-4" aria-hidden /> Clear search
            </Button>
          ) : undefined
        }
      />

      <form onSubmit={onSubmit} role="search" className="mb-6">
        <label htmlFor="search-page-input" className="sr-only">
          Search your notes
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3.5 h-4.5 w-4.5 text-zinc-400" aria-hidden />
          <input
            id="search-page-input"
            type="search"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by title, content, tag or folder…"
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm text-zinc-900 shadow-soft transition focus:border-brand-400 focus:outline-2 focus:outline-brand-500/30 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-100"
          />
        </div>
      </form>

      {/* Status line */}
      <div aria-live="polite" className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        {loading
          ? 'Searching…'
          : error
            ? null
            : searched
              ? `${results.length} result${results.length === 1 ? '' : 's'} for “${term}”`
              : term.length === 1
                ? 'Keep typing — search needs at least 2 characters.'
                : null}
      </div>

      {error && (
        <div className="card border-red-200 p-6 text-center dark:border-red-900/50">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </Button>
        </div>
      )}

      {loading && <NoteCardSkeleton count={3} />}

      {!loading && !error && searched && results.length === 0 && (
        <div className="card flex flex-col items-center rounded-2xl border-dashed px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-white/10">
            <SearchX className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No matches found</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Nothing matched “{term}”. Try different words, check your spelling, or search by tag or
            folder name.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={clear}>
              Clear search
            </Button>
            <Link
              to="/app/notes/new"
              className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Create a new note
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && !searched && (
        <div className="card flex flex-col items-center rounded-2xl border-dashed px-6 py-16 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
            <Search className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Find anything fast</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Start typing to search every active note — titles, paragraphs, tags and folders are all
            included.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {results.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
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
