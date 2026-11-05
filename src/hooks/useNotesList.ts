import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNotes, type NoteListScope } from '@/lib/api'
import type { NoteWithRefs, SortKey } from '@/lib/types'
import { useData } from '@/state/DataContext'

/** Tracks browser connectivity with online/offline events. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

interface UseNotesListOptions {
  sort: SortKey
  folderId?: string | null
  tagId?: string | null
  /** Set false to fetch manually (e.g. inside dialogs). */
  auto?: boolean
}

/**
 * Paginated note list for any scope. Refetches automatically when a
 * mutation elsewhere bumps the shared data version.
 */
export function useNotesList(scope: NoteListScope, options: UseNotesListOptions) {
  const { sort, folderId = null, tagId = null, auto = true } = options
  const { version } = useData()
  const [notes, setNotes] = useState<NoteWithRefs[]>([])
  const [loading, setLoading] = useState(auto)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const pageRef = useRef(0)
  const reqIdRef = useRef(0)

  const load = useCallback(
    async (page: number) => {
      const reqId = ++reqIdRef.current
      setLoading(true)
      setError(null)
      try {
        const res = await fetchNotes(scope, sort, page, folderId, tagId)
        if (reqId !== reqIdRef.current) return // stale response — ignore
        pageRef.current = page
        setNotes((prev) => (page === 0 ? res.notes : [...prev, ...res.notes.filter((n) => !prev.some((p) => p.id === n.id))]))
        setHasMore(res.hasMore)
      } catch (err) {
        if (reqId !== reqIdRef.current) return
        setError(err instanceof Error ? err.message : 'Could not load notes.')
        setNotes([])
        setHasMore(false)
      } finally {
        if (reqId === reqIdRef.current) setLoading(false)
      }
    },
    [scope, sort, folderId, tagId],
  )

  // Refetch from page 0 whenever inputs or the data version change
  useEffect(() => {
    if (!auto) return
    void load(0)
  }, [auto, load, version])

  const reload = useCallback(() => void load(0), [load])
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    void load(pageRef.current + 1)
  }, [loading, hasMore, load])

  /** Replace one note in place (optimistic UI after a toggle). */
  const patchLocal = useCallback((id: string, patch: Partial<NoteWithRefs>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }, [])

  return { notes, loading, error, hasMore, reload, loadMore, patchLocal }
}
