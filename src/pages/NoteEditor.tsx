import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FolderOpen,
  Hash,
  Loader2,
  Mic,
  MicOff,
  Pin,
  Plus,
  Save,
  Share2,
  Star,
  Tags,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import { ConfirmDialog, Modal } from '@/components/Modal'
import { Button, CenterSpinner, Field, Input, Select, Skeleton, Switch } from '@/components/ui'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { TextToSpeechPlayer } from '@/components/TextToSpeechPlayer'
import {
  createNote,
  createTag,
  getNote,
  patchNote,
  setNoteTags,
  trashNote,
  updateNote,
  type NotePatch,
} from '@/lib/api'
import { clearDraft, loadDraft, saveDraft, type Draft } from '@/lib/prefs'
import { exportNoteMarkdown } from '@/lib/export'
import { cn, defaultTitle, fullDate, relativeTime } from '@/lib/format'
import { friendlyError } from '@/lib/supabase'
import { noteContentSchema } from '@/lib/validation'
import type { NoteWithRefs } from '@/lib/types'
import { useTags } from '@/hooks/useCatalog'
import { useFolders } from '@/hooks/useCatalog'
import { useData } from '@/state/DataContext'
import { usePrefs } from '@/state/PrefsContext'
import { useToast } from '@/state/ToastContext'

type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

const AUTOSAVE_DELAY = 1200

function StatusPill({
  status,
  updatedAt,
  onRetry,
}: {
  status: SaveStatus
  updatedAt: string | null
  onRetry: () => void
}) {
  if (status === 'saving')
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    )
  if (status === 'saved')
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" aria-hidden /> Saved {updatedAt ? `· ${relativeTime(updatedAt)}` : ''}
      </span>
    )
  if (status === 'error')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Save failed
        <button
          type="button"
          onClick={onRetry}
          className="rounded underline underline-offset-2 hover:text-red-700 dark:hover:text-red-300"
        >
          Retry
        </button>
      </span>
    )
  if (status === 'dirty')
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden /> Unsaved changes
      </span>
    )
  return null
}

export function NoteEditorPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams()
  const routeId = mode === 'edit' ? (params.noteId ?? '') : ''
  const navigate = useNavigate()
  const toast = useToast()
  const { bump } = useData()
  const { prefs } = usePrefs()
  const { folders, loading: foldersLoading } = useFolders()
  const { tags, loading: tagsLoading } = useTags()

  // Core note state -------------------------------------------------------
  const [activeId, setActiveId] = useState<string | null>(mode === 'edit' ? routeId : null)
  const [serverNote, setServerNote] = useState<NoteWithRefs | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isArchived, setIsArchived] = useState(false)
  const [version, setVersion] = useState(0)

  // UI state --------------------------------------------------------------
  const [loading, setLoading] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [dirty, setDirty] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [confirm, setConfirm] = useState<null | 'delete'>(null)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [draftOffer, setDraftOffer] = useState<Draft | null>(null)

  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const dirtyRef = useRef(false)
  const loadedIdRef = useRef<string | null>(mode === 'edit' ? routeId : null)
  const blockedNavRef = useRef(false)
  const stateRef = useRef({ title, content, folderId, tagIds, isPinned, isFavorite, isArchived })
  stateRef.current = { title, content, folderId, tagIds, isPinned, isFavorite, isArchived }

  // Identity refs: `save()` reads these instead of render state, so a queued or
  // delayed autosave can never act on stale values — which would insert a
  // duplicate note instead of updating the one just created.
  const activeIdRef = useRef<string | null>(mode === 'edit' ? routeId : null)
  const serverNoteRef = useRef<NoteWithRefs | null>(null)
  const versionRef = useRef(0)

  const applyActiveId = (id: string | null) => {
    activeIdRef.current = id
    setActiveId(id)
  }
  const applyServerNote = (note: NoteWithRefs | null) => {
    serverNoteRef.current = note
    setServerNote(note)
  }
  const applyVersion = (v: number) => {
    versionRef.current = v
    setVersion(v)
  }

  // Load an existing note --------------------------------------------------
  useEffect(() => {
    if (mode !== 'edit' || !routeId) return
    if (loadedIdRef.current === routeId && dirtyRef.current && serverNote) return // don't clobber unsaved edits
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getNote(routeId)
      .then((note) => {
        if (cancelled) return
        if (!note) {
          setLoadError('This note does not exist, or you do not have access to it.')
          return
        }
        loadedIdRef.current = note.id
        applyActiveId(note.id)
        applyServerNote(note)
        setTitle(note.title)
        setContent(note.content)
        setFolderId(note.folder_id)
        setTagIds(note.tags.map((t) => t.id))
        setIsPinned(note.is_pinned)
        setIsFavorite(note.is_favorite)
        setIsArchived(note.is_archived)
        applyVersion(note.version)
        setStatus('saved')
        setDirty(false)
        dirtyRef.current = false
        clearDraft()
        // Offer recovery of an unsaved draft from a previous session
        const draft = loadDraft(note.id)
        if (draft && new Date(draft.savedAt).getTime() > new Date(note.updated_at).getTime()) {
          setDraftOffer(draft)
        } else {
          setDraftOffer(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(friendlyError(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line
  }, [mode, routeId])

  // Create-mode defaults ----------------------------------------------------
  useEffect(() => {
    if (mode === 'create') {
      setFolderId(prefs.defaultFolderId)
      const draft = loadDraft('new')
      if (draft) setDraftOffer(draft)
    }
    // eslint-disable-next-line
  }, [mode])

  // Save (shared by manual save, autosave and toggles) ----------------------
  const save = useCallback(
    async (silent = false): Promise<boolean> => {
      const { title: t, content: c, folderId: f, tagIds: tg, isPinned: p, isFavorite: fv, isArchived: ar } = stateRef.current

      const parsed = noteContentSchema.safeParse({ title: t, content: c })
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? 'Add a title or some content before saving.'
        if (!silent) {
          setValidationError(msg)
          setStatus('dirty')
        } else {
          setStatus('idle')
        }
        return false
      }
      setValidationError(null)

      // Prevent overlapping requests; queue the latest one
      if (savingRef.current) {
        pendingRef.current = true
        return false
      }
      savingRef.current = true
      setStatus('saving')
      let navTarget: string | null = null

      try {
        const input = {
          title: (t.trim() || defaultTitle(c)).slice(0, 120),
          content: c,
          folder_id: f,
          is_pinned: p,
          is_favorite: fv,
          is_archived: ar,
        }

        if (!activeIdRef.current || !serverNoteRef.current) {
          // ---- create ----
          const created = await createNote(input, tg)
          applyActiveId(created.id)
          applyServerNote(created)
          applyVersion(created.version)
          loadedIdRef.current = created.id
          clearDraft()

          if (silent) {
            // Autosave while typing: update browser URL bar without tearing down or unmounting
            window.history.replaceState(window.history.state, '', `/app/notes/${created.id}`)
          } else if (prefs.stayAfterSave) {
            window.history.replaceState(window.history.state, '', `/app/notes/${created.id}`)
          } else {
            navTarget = '/app/notes'
          }
        } else {
          // ---- update with optimistic concurrency ----
          const res = await updateNote(serverNoteRef.current.id, input, versionRef.current)
          if (!res.ok) {
            savingRef.current = false
            setConflict(true)
            setStatus('error')
            toast.error('This note was updated elsewhere — review the options above.')
            return false
          }
          applyServerNote(res.note)
          applyVersion(res.note.version)
          // Persist tag changes only when they actually changed
          const before = new Set(serverNoteRef.current.tags.map((x) => x.id))
          const changed = before.size !== tg.length || tg.some((id) => !before.has(id))
          if (changed) {
            await setNoteTags(res.note.id, tg)
            const refreshed = await getNote(res.note.id)
            if (refreshed) applyServerNote(refreshed)
          }
          clearDraft()
          if (!silent && !prefs.stayAfterSave) navTarget = '/app/notes'
        }

        setDirty(false)
        dirtyRef.current = false
        setStatus('saved')
        bump()
        // Never fight the unsaved-changes guard — it resolves navigation itself
        if (navTarget && !blockedNavRef.current) {
          navigate(navTarget, { replace: mode === 'create' })
        }
        if (!silent) toast.success('Note saved')
        return true
      } catch (err) {
        // Keep unsaved edits in state + a local draft so nothing is lost
        setStatus('error')
        if (!silent) toast.error(friendlyError(err))
        try {
          const { title: t2, content: c2, folderId: f2, tagIds: tg2 } = stateRef.current
          saveDraft(activeIdRef.current ?? activeId ?? 'new', {
            title: t2,
            content: c2,
            folderId: f2,
            tagIds: tg2,
            savedAt: new Date().toISOString(),
          })
        } catch {
          /* draft storage is best-effort */
        }
        return false
      } finally {
        savingRef.current = false
        if (pendingRef.current) {
          pendingRef.current = false
          void save(silent)
        }
      }
    },
    // eslint-disable-next-line
    [activeId, serverNote, version, navigate, toast, bump, mode, prefs.stayAfterSave],
  )

  const markDirty = useCallback(() => {
    setDirty(true)
    dirtyRef.current = true
    setStatus((s) => (s === 'saving' ? s : 'dirty'))
    // Best-effort draft for crash/offline recovery
    try {
      const { title: t, content: c, folderId: f, tagIds: tg } = stateRef.current
      saveDraft(activeIdRef.current ?? activeId ?? 'new', {
        title: t,
        content: c,
        folderId: f,
        tagIds: tg,
        savedAt: new Date().toISOString(),
      })
    } catch {
      /* ignore */
    }
  }, [activeId])

  // Voice transcription using Web Speech API --------------------------------
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSpeechTranscript = useCallback(
    (spokenText: string) => {
      setContent((prev) => {
        const textarea = textareaRef.current
        if (textarea && document.activeElement === textarea) {
          const start = textarea.selectionStart ?? prev.length
          const end = textarea.selectionEnd ?? prev.length
          const before = prev.slice(0, start)
          const after = prev.slice(end)

          const trimmedBefore = before.trimEnd()
          const needsSpaceBefore = before.length > 0 && !/[\s\n]$/.test(before)
          const endsWithSentence = !trimmedBefore || /[.!?\n]$/.test(trimmedBefore)
          const formatted = endsWithSentence
            ? spokenText.charAt(0).toUpperCase() + spokenText.slice(1)
            : spokenText

          const insert = (needsSpaceBefore ? ' ' : '') + formatted
          const newContent = before + insert + after

          const newCursorPos = start + insert.length
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = newCursorPos
              textareaRef.current.selectionEnd = newCursorPos
            }
          })
          return newContent
        }

        const trimmed = prev.trimEnd()
        if (!trimmed) {
          return spokenText.charAt(0).toUpperCase() + spokenText.slice(1)
        }
        const endsWithSentence = /[.!?\n]$/.test(trimmed)
        const formatted = endsWithSentence
          ? spokenText.charAt(0).toUpperCase() + spokenText.slice(1)
          : spokenText
        const separator = prev.endsWith('\n') ? '' : ' '
        return trimmed + separator + formatted
      })
      setValidationError(null)
      markDirty()
    },
    [markDirty],
  )

  const {
    isSupported: speechSupported,
    isListening,
    interimText,
    error: speechError,
    toggleListening,
    stopListening,
  } = useSpeechRecognition({
    onTranscript: handleSpeechTranscript,
  })

  useEffect(() => {
    if (speechError) {
      toast.error(speechError)
    }
  }, [speechError, toast])

  const {
    isSupported: ttsSupported,
    isPlaying: ttsPlaying,
    isPaused: ttsPaused,
    rate: ttsRate,
    setRate: setTtsRate,
    speak: ttsSpeak,
    pause: ttsPause,
    resume: ttsResume,
    stop: ttsStop,
  } = useTextToSpeech({
    onError: (msg) => toast.error(msg),
  })

  const handleVoiceToggle = () => {
    if (!speechSupported) {
      toast.error(
        'Voice transcription (Web Speech API) is not supported in this browser. Please try Chrome, Edge, or Safari.',
      )
      return
    }
    if (!isListening) {
      ttsStop()
    }
    toggleListening()
  }

  const handleReadAloud = useCallback(() => {
    if (!ttsSupported) {
      toast.error('Text-to-Speech (Web Speech API) is not supported in this browser.')
      return
    }
    if (ttsPlaying) {
      if (ttsPaused) {
        ttsResume()
      } else {
        ttsPause()
      }
      return
    }
    stopListening()
    const readText = [title.trim(), content.trim()].filter(Boolean).join('. \n\n')
    if (!readText) {
      toast.error('Add a title or note content first to listen.')
      return
    }
    ttsSpeak(readText)
  }, [ttsSupported, ttsPlaying, ttsPaused, ttsResume, ttsPause, stopListening, title, content, ttsSpeak, toast])

  // Autosave (debounced, never every keystroke) -----------------------------
  useEffect(() => {
    if (!prefs.autosave || !dirty) return
    const timer = window.setTimeout(() => void save(true), AUTOSAVE_DELAY)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line
  }, [dirty, title, content, folderId, tagIds, isPinned, isFavorite, isArchived, prefs.autosave, save])

  // Warn on browser unload while unsaved ------------------------------------
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // Block in-app navigation while unsaved -----------------------------------
  // Reads `dirtyRef` rather than the rendered flag so a navigation that happens
  // right after a successful save (dirtyRef already cleared) is not blocked.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  )
  blockedNavRef.current = blocker.state === 'blocked'

  // Immediate toggles --------------------------------------------------------
  const applyToggle = async (patch: { is_pinned?: boolean; is_favorite?: boolean }, successMsg: string) => {
    if (!serverNote) {
      // New note — the toggle is part of the draft and saves with it
      if (patch.is_pinned !== undefined) setIsPinned(patch.is_pinned)
      if (patch.is_favorite !== undefined) setIsFavorite(patch.is_favorite)
      markDirty()
      return
    }
    try {
      const updated = await patchNote(serverNote.id, patch)
      applyServerNote(updated)
      applyVersion(updated.version)
      if (patch.is_pinned !== undefined) setIsPinned(updated.is_pinned)
      if (patch.is_favorite !== undefined) setIsFavorite(updated.is_favorite)
      bump()
      toast.success(successMsg)
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const toggleArchive = async () => {
    if (!serverNote) return
    try {
      const updated = await patchNote(serverNote.id, { is_archived: !isArchived })
      applyServerNote(updated)
      applyVersion(updated.version)
      setIsArchived(updated.is_archived)
      bump()
      toast.success(updated.is_archived ? 'Note archived' : 'Note restored to All Notes')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const doDelete = async () => {
    if (!serverNote) return
    try {
      await trashNote(serverNote.id)
      clearDraft()
      bump()
      toast.success('Note moved to Trash')
      navigate('/app/notes', { replace: true })
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setConfirm(null)
    }
  }

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${content}`.trim())
      toast.success('Note content copied')
    } catch {
      toast.error('Could not copy to the clipboard.')
    }
  }

  const downloadNote = () => {
    if (!serverNote) return
    exportNoteMarkdown({ ...serverNote, title, content, folder_name: serverNote.folder_name })
    toast.success('Note downloaded as Markdown')
  }

  const shareNote = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title: title || 'QuickNote', text: `${title}\n\n${content}` })
    } catch {
      /* user cancelled the share sheet */
    }
  }

  // Conflict resolution ------------------------------------------------------
  const conflictPatch = (): NotePatch => {
    const s = stateRef.current
    return {
      title: (s.title.trim() || defaultTitle(s.content)).slice(0, 120),
      content: s.content,
      folder_id: s.folderId,
      is_pinned: s.isPinned,
      is_favorite: s.isFavorite,
      is_archived: s.isArchived,
    }
  }

  const resolveOverwrite = async () => {
    if (!serverNote) return
    try {
      const latest = await getNote(serverNote.id)
      if (!latest) throw new Error('Note not found')
      const res = await updateNote(latest.id, conflictPatch(), latest.version)
      if (!res.ok) throw new Error('Conflict persists — try again.')
      applyServerNote(res.note)
      applyVersion(res.note.version)
      setConflict(false)
      setDirty(false)
      dirtyRef.current = false
      setStatus('saved')
      clearDraft()
      bump()
      toast.success('Note updated with your changes')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const resolveReload = async () => {
    if (!serverNote) return
    try {
      const latest = await getNote(serverNote.id)
      if (!latest) throw new Error('Note not found')
      applyServerNote(latest)
      setTitle(latest.title)
      setContent(latest.content)
      setFolderId(latest.folder_id)
      setTagIds(latest.tags.map((t) => t.id))
      setIsPinned(latest.is_pinned)
      setIsFavorite(latest.is_favorite)
      setIsArchived(latest.is_archived)
      applyVersion(latest.version)
      setConflict(false)
      setDirty(false)
      dirtyRef.current = false
      setStatus('saved')
      toast.info('Loaded the latest version of this note')
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }

  const recoverDraft = () => {
    if (!draftOffer) return
    setTitle(draftOffer.title)
    setContent(draftOffer.content)
    setFolderId(draftOffer.folderId)
    setTagIds(draftOffer.tagIds)
    setDraftOffer(null)
    markDirty()
    toast.info('Draft restored — review and save when ready.')
  }

  // Derived ------------------------------------------------------------------
  const inTrash = Boolean(serverNote?.deleted_at)
  const isNew = !serverNote
  const selectedTags = useMemo(() => tags.filter((t) => tagIds.includes(t.id)), [tags, tagIds])
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  const onTitleSubmit = (e: FormEvent) => {
    e.preventDefault()
    textareaRef.current?.focus()
  }

  // Early returns ------------------------------------------------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-10 w-3/4" />
        <Skeleton className="mt-4 h-64 w-full" />
        <span className="sr-only">Loading note</span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="card p-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Can't open this note</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{loadError}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
            <Link
              to="/app/notes"
              className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
            >
              Back to notes
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (inTrash && serverNote) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="card p-8 text-center animate-slide-up">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-white/10">
            <Trash2 className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">This note is in Trash</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Restore it to keep editing, or leave it in Trash until you need it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={async () => {
                try {
                  await patchNote(serverNote.id, { deleted_at: null })
                  bump()
                  toast.success('Note restored')
                  applyServerNote({ ...serverNote, deleted_at: null })
                } catch (err) {
                  toast.error(friendlyError(err))
                }
              }}
            >
              Restore note
            </Button>
            <Link
              to="/app/trash"
              className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
            >
              Go to Trash
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Main editor --------------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isNew ? 'New note' : 'Edit note'}
          </h1>
          <StatusPill status={status} updatedAt={serverNote?.updated_at ?? null} onRetry={() => void save(false)} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={isPinned ? 'subtle' : 'ghost'}
            size="sm"
            aria-pressed={isPinned}
            onClick={() => void applyToggle({ is_pinned: !isPinned }, isPinned ? 'Note unpinned' : 'Note pinned')}
            title={isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className={isPinned ? 'h-4 w-4 fill-current' : 'h-4 w-4'} aria-hidden />
            <span className="hidden sm:inline">{isPinned ? 'Pinned' : 'Pin'}</span>
          </Button>
          <Button
            variant={isFavorite ? 'subtle' : 'ghost'}
            size="sm"
            aria-pressed={isFavorite}
            onClick={() => void applyToggle({ is_favorite: !isFavorite }, isFavorite ? 'Removed from favorites' : 'Added to favorites')}
            title={isFavorite ? 'Remove favorite' : 'Add to favorites'}
          >
            <Star className={isFavorite ? 'h-4 w-4 fill-amber-400 text-amber-500' : 'h-4 w-4'} aria-hidden />
            <span className="hidden sm:inline">{isFavorite ? 'Favorite' : 'Favorite'}</span>
          </Button>
          {serverNote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void toggleArchive()}
              title={isArchived ? 'Unarchive' : 'Archive'}
            >
              {isArchived ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
              <span className="hidden sm:inline">{isArchived ? 'Unarchive' : 'Archive'}</span>
            </Button>
          )}

          {/* Voice transcription via Web Speech API */}
          <Button
            variant={isListening ? 'primary' : 'ghost'}
            size="sm"
            aria-pressed={isListening}
            onClick={handleVoiceToggle}
            className={isListening ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' : ''}
            title={
              !speechSupported
                ? 'Voice transcription is not supported in this browser'
                : isListening
                ? 'Stop voice transcription'
                : 'Transcribe voice into note content'
            }
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4" aria-hidden />
                <span>Listening…</span>
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
                <span className="hidden sm:inline">Transcribe</span>
              </>
            )}
          </Button>

          {/* Text-to-Speech via Web Speech API */}
          <Button
            variant={ttsPlaying ? 'subtle' : 'ghost'}
            size="sm"
            aria-pressed={ttsPlaying}
            onClick={handleReadAloud}
            className={ttsPlaying && !ttsPaused ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : ''}
            title={
              !ttsSupported
                ? 'Text-to-Speech is not supported in this browser'
                : ttsPlaying
                ? ttsPaused
                  ? 'Resume reading note aloud'
                  : 'Pause reading note aloud'
                : 'Listen to note read back to you (Text-to-Speech)'
            }
          >
            <Volume2 className={cn('h-4 w-4', ttsPlaying && !ttsPaused ? 'text-brand-600 dark:text-brand-400 animate-pulse' : '')} aria-hidden />
            <span className="hidden sm:inline">
              {ttsPlaying ? (ttsPaused ? 'Resume' : 'Pause') : 'Listen'}
            </span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => void save(false)} loading={status === 'saving'}>
            <Save className="h-4 w-4" aria-hidden />
            Save
          </Button>
        </div>
      </div>

      {/* Text-to-Speech Player Bar */}
      <TextToSpeechPlayer
        title={title || 'Untitled note'}
        isPlaying={ttsPlaying}
        isPaused={ttsPaused}
        rate={ttsRate}
        onPlayPause={handleReadAloud}
        onStop={ttsStop}
        onChangeRate={setTtsRate}
      />

      {/* Banners */}
      {conflict && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/50" role="alert">
          <p className="flex items-start gap-2 text-sm font-medium text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            This note was updated elsewhere (another tab or device). Your edits are safe below —
            choose how to continue.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void resolveOverwrite()}>
              Overwrite with my version
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void resolveReload()}>
              Load the other version
            </Button>
          </div>
        </div>
      )}

      {draftOffer && !dirty && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/50" role="status">
          <p className="text-sm font-medium text-brand-900 dark:text-brand-200">
            You have an unsaved draft from {relativeTime(draftOffer.savedAt)}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={recoverDraft}>
              Restore draft
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                clearDraft()
                setDraftOffer(null)
              }}
            >
              Discard draft
            </Button>
          </div>
        </div>
      )}

      {validationError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300" role="alert">
          {validationError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* Editor */}
        <form onSubmit={onTitleSubmit} className="card flex min-w-0 flex-col p-4 sm:p-6">
          <label htmlFor="note-title" className="sr-only">
            Note title
          </label>
          <input
            id="note-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setValidationError(null)
              markDirty()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                textareaRef.current?.focus()
              }
            }}
            placeholder="Untitled note"
            maxLength={120}
            className="w-full border-none bg-transparent text-2xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-600"
          />
          <div className="my-3 flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 dark:border-white/10">
            <span className="text-xs font-medium text-zinc-400">Note Content</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleReadAloud}
                aria-label={ttsPlaying ? (ttsPaused ? 'Resume reading note' : 'Pause reading note') : 'Listen to note'}
                title={
                  !ttsSupported
                    ? 'Text-to-Speech is not supported in this browser'
                    : ttsPlaying
                    ? ttsPaused
                      ? 'Resume reading note'
                      : 'Pause reading note'
                    : 'Listen to note read back to you (Text-to-Speech)'
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                  ttsPlaying
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200',
                )}
              >
                <Volume2 className={cn('h-3.5 w-3.5 text-brand-600 dark:text-brand-400', ttsPlaying && !ttsPaused ? 'animate-pulse' : '')} aria-hidden />
                <span>{ttsPlaying ? (ttsPaused ? 'Resume' : 'Listening…') : 'Listen'}</span>
              </button>

              <button
                type="button"
                onClick={handleVoiceToggle}
                aria-label={isListening ? 'Stop voice transcription' : 'Transcribe voice to text'}
                title={
                  !speechSupported
                    ? 'Voice transcription is not supported in this browser'
                    : isListening
                    ? 'Stop voice transcription'
                    : 'Transcribe voice to text (Web Speech API)'
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition',
                  isListening
                    ? 'bg-rose-100 text-rose-700 animate-pulse dark:bg-rose-950 dark:text-rose-300'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200',
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" aria-hidden />
                    <span className="font-semibold text-rose-700 dark:text-rose-300">Recording…</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
                    <span>Dictate note</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Voice transcription live status bar if listening */}
          {isListening && (
            <div
              role="status"
              className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 animate-slide-up dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
                </span>
                <span className="font-semibold text-rose-700 dark:text-rose-400">Listening:</span>
                <span className="truncate italic text-zinc-700 dark:text-zinc-300">
                  {interimText ? `“${interimText}”` : 'Speak into your microphone…'}
                </span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100 dark:bg-surface-dark dark:text-rose-300 dark:hover:bg-white/10"
              >
                Done
              </button>
            </div>
          )}

          <label htmlFor="note-content" className="sr-only">
            Note content
          </label>
          <textarea
            ref={textareaRef}
            id="note-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setValidationError(null)
              markDirty()
            }}
            placeholder="Start writing… Use blank lines to separate paragraphs, or click Dictate to transcribe your voice."
            rows={18}
            className="w-full flex-1 resize-y border-none bg-transparent text-[0.95rem] leading-7 text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-600"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-400 dark:border-white/10">
            <span>
              {serverNote ? (
                <>
                  Created {fullDate(serverNote.created_at)} · Updated {fullDate(serverNote.updated_at)}
                </>
              ) : (
                'Autosaves after you stop typing'
              )}
            </span>
            <span>{content.trim() ? content.trim().split(/\s+/).length : 0} words</span>
          </div>
          {/* Enter-to-save without a visible extra button */}
          <button type="submit" className="sr-only">
            Save note
          </button>
        </form>

        {/* Metadata panel */}
        <aside className="flex flex-col gap-4" aria-label="Note settings">
          <div className="card p-4">
            <Field label="Folder" htmlFor="note-folder" hint="Keep notes grouped together.">
              <Select
                id="note-folder"
                value={folderId ?? ''}
                disabled={foldersLoading}
                onChange={(e) => {
                  setFolderId(e.target.value || null)
                  markDirty()
                }}
              >
                <option value="">No folder (Uncategorized)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="mt-4">
              <p className="mb-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-1 pr-1 pl-2 text-xs font-medium text-brand-700 dark:bg-brand-950/70 dark:text-brand-300"
                  >
                    #{t.name}
                    <button
                      type="button"
                      aria-label={`Remove tag ${t.name}`}
                      onClick={() => {
                        setTagIds((ids) => ids.filter((x) => x !== t.id))
                        markDirty()
                      }}
                      className="rounded p-0.5 hover:bg-brand-100 dark:hover:bg-brand-900"
                    >
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setTagPickerOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-zinc-600 dark:hover:border-brand-600 dark:hover:text-brand-400"
                >
                  <Plus className="h-3 w-3" aria-hidden /> Add tag
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 dark:border-white/10">
              <Switch
                checked={isPinned}
                onChange={(v) => void applyToggle({ is_pinned: v }, v ? 'Note pinned' : 'Note unpinned')}
                label="Pinned"
                description="Keep this note easy to find."
              />
              <Switch
                checked={isFavorite}
                onChange={(v) => void applyToggle({ is_favorite: v }, v ? 'Added to favorites' : 'Removed from favorites')}
                label="Favorite"
                description="Star it for quick access."
              />
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => void copyContent()}>
                <Copy className="h-4 w-4" aria-hidden /> Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadNote} disabled={!serverNote}>
                <Download className="h-4 w-4" aria-hidden /> Download
              </Button>
              {canShare && (
                <Button variant="secondary" size="sm" onClick={() => void shareNote()} disabled={!serverNote}>
                  <Share2 className="h-4 w-4" aria-hidden /> Share
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setTagPickerOpen(true)}>
                <Tags className="h-4 w-4" aria-hidden /> Tags
              </Button>
            </div>
            {serverNote && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                onClick={() => setConfirm('delete')}
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Move to Trash
              </Button>
            )}
          </div>

          {serverNote && (
            <div className="card p-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              <p className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-300">
                <FolderOpen className="h-3.5 w-3.5" aria-hidden /> Details
              </p>
              <p className="mt-2">Created: {fullDate(serverNote.created_at)}</p>
              <p>Last updated: {relativeTime(serverNote.updated_at)}</p>
              <p className="mt-1">Autosave: {prefs.autosave ? 'On' : 'Off (manual saves)'}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Tag picker */}
      <Modal
        open={tagPickerOpen}
        onClose={() => setTagPickerOpen(false)}
        title="Tags for this note"
        description="Pick existing tags or create a new one."
        footer={
          <Button onClick={() => setTagPickerOpen(false)} form="tag-picker-form">
            Done
          </Button>
        }
      >
        <div className="space-y-4">
          {tagsLoading ? (
            <CenterSpinner label="Loading tags" />
          ) : tags.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No tags yet — create your first one below.
            </p>
          ) : (
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto scroll-area">
              {tags.map((t) => {
                const selected = tagIds.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setTagIds((ids) => (selected ? ids.filter((x) => x !== t.id) : [...ids, t.id]))
                      markDirty()
                    }}
                    className={
                      selected
                        ? 'inline-flex h-8 items-center gap-1 rounded-full bg-brand-600 px-3 text-xs font-medium text-white'
                        : 'inline-flex h-8 items-center gap-1 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:border-brand-400 hover:text-brand-700 dark:border-white/10 dark:text-zinc-300'
                    }
                  >
                    <Hash className="h-3 w-3" aria-hidden />
                    {t.name}
                    {selected && <Check className="h-3 w-3" aria-hidden />}
                  </button>
                )
              })}
            </div>
          )}

          <form
            id="tag-picker-form"
            onSubmit={async (e) => {
              e.preventDefault()
              const name = newTagName.trim().toLowerCase()
              if (!name) return
              try {
                const created = await createTag(name)
                setTagIds((ids) => [...ids, created.id])
                setNewTagName('')
                markDirty()
                toast.success(`Tag #${created.name} added`)
              } catch (err) {
                toast.error(friendlyError(err))
              }
            }}
            className="flex items-end gap-2"
          >
            <Field label="New tag" htmlFor="new-tag" className="flex-1">
              <Input
                id="new-tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={24}
                placeholder="e.g. ideas"
              />
            </Field>
            <Button type="submit" variant="secondary" disabled={!newTagName.trim()}>
              Add
            </Button>
          </form>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Move to Trash?"
        message={
          <>
            “{title || defaultTitle(content)}” will be moved to Trash. You can restore it later or
            delete it permanently from there.
          </>
        }
        confirmLabel="Move to Trash"
        danger
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />

      {/* Unsaved-changes navigation guard */}
      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="You have unsaved changes"
        description="Save them before leaving, or discard them. Your edits are also kept as a local draft until they're saved."
        footer={
          <>
            <Button variant="ghost" onClick={() => blocker.reset?.()}>
              Stay here
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDirty(false)
                dirtyRef.current = false
                blocker.proceed?.()
              }}
            >
              Discard changes
            </Button>
            <Button
              onClick={() => {
                const nothingToKeep = !title.trim() && !content.trim()
                if (nothingToKeep) {
                  setDirty(false)
                  dirtyRef.current = false
                  blocker.proceed?.()
                  return
                }
                void save(false).then((ok) => {
                  if (ok) blocker.proceed?.()
                })
              }}
            >
              Save & leave
            </Button>
          </>
        }
      >
        <p className="pb-1 text-sm text-zinc-600 dark:text-zinc-300">
          QuickNote saved a temporary draft on this device, so nothing is lost if you come back.
        </p>
      </Modal>
    </div>
  )
}
