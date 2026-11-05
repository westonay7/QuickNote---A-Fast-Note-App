import { useCallback, useState } from 'react'
import {
  permanentDelete,
  patchNote,
  restoreNote,
  trashNote,
} from '@/lib/api'
import { exportNoteMarkdown } from '@/lib/export'
import { friendlyError } from '@/lib/supabase'
import type { NoteWithRefs } from '@/lib/types'
import { useData } from '@/state/DataContext'
import { useToast } from '@/state/ToastContext'

export interface ConfirmState {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
}

/**
 * Shared note actions (pin, favorite, archive, trash, restore, delete,
 * copy, export) with toast feedback, confirmation state and cache invalidation.
 */
export function useNoteActions() {
  const { bump } = useData()
  const toast = useToast()
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const run = useCallback(
    async (fn: () => Promise<unknown>, success: string) => {
      try {
        await fn()
        bump()
        toast.success(success)
      } catch (err) {
        toast.error(friendlyError(err))
      }
    },
    [bump, toast],
  )

  const togglePin = useCallback(
    (note: NoteWithRefs) =>
      void run(() => patchNote(note.id, { is_pinned: !note.is_pinned }), note.is_pinned ? 'Note unpinned' : 'Note pinned'),
    [run],
  )

  const toggleFavorite = useCallback(
    (note: NoteWithRefs) =>
      void run(
        () => patchNote(note.id, { is_favorite: !note.is_favorite }),
        note.is_favorite ? 'Removed from favorites' : 'Added to favorites',
      ),
    [run],
  )

  const archive = useCallback(
    (note: NoteWithRefs) =>
      void run(
        () => patchNote(note.id, { is_archived: !note.is_archived }),
        note.is_archived ? 'Note restored to All Notes' : 'Note archived',
      ),
    [run],
  )

  const trash = useCallback(
    (note: NoteWithRefs) =>
      setConfirm({
        title: 'Move to Trash?',
        message: `“${note.title || 'Untitled note'}” will be moved to Trash. You can restore it later, or empty the Trash to remove it permanently.`,
        confirmLabel: 'Move to Trash',
        danger: true,
        onConfirm: async () => {
          setConfirmBusy(true)
          try {
            await trashNote(note.id)
            bump()
            toast.success('Note moved to Trash')
          } catch (err) {
            toast.error(friendlyError(err))
          } finally {
            setConfirmBusy(false)
            setConfirm(null)
          }
        },
      }),
    [bump, toast],
  )

  const restore = useCallback(
    (note: NoteWithRefs) =>
      void run(() => restoreNote(note.id), 'Note restored'),
    [run],
  )

  const deleteForever = useCallback(
    (note: NoteWithRefs) =>
      setConfirm({
        title: 'Delete permanently?',
        message: `“${note.title || 'Untitled note'}” will be erased for good. This action cannot be undone.`,
        confirmLabel: 'Delete forever',
        danger: true,
        onConfirm: async () => {
          setConfirmBusy(true)
          try {
            await permanentDelete(note.id)
            bump()
            toast.success('Note deleted permanently')
          } catch (err) {
            toast.error(friendlyError(err))
          } finally {
            setConfirmBusy(false)
            setConfirm(null)
          }
        },
      }),
    [bump, toast],
  )

  const copy = useCallback(
    async (note: NoteWithRefs) => {
      try {
        await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`.trim())
        toast.success('Note content copied')
      } catch {
        toast.error('Could not copy to the clipboard.')
      }
    },
    [toast],
  )

  const exportMd = useCallback(
    (note: NoteWithRefs) => {
      exportNoteMarkdown(note)
      toast.success('Note downloaded as Markdown')
    },
    [toast],
  )

  const readAloud = useCallback(
    (note: NoteWithRefs) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        toast.error('Text-to-Speech (Web Speech API) is not supported in this browser.')
        return
      }
      const text = [note.title.trim(), note.content.trim()].filter(Boolean).join('. \n\n')
      if (!text) {
        toast.error('This note has no text to read.')
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = navigator.language || 'en-US'
      utterance.rate = 1
      utterance.onstart = () => {
        toast.info(`Reading aloud: “${note.title || 'Untitled note'}”`)
      }
      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          toast.error(`Speech error: ${e.error}`)
        }
      }
      window.speechSynthesis.speak(utterance)
    },
    [toast],
  )

  return {
    confirm,
    confirmBusy,
    dismissConfirm: () => setConfirm(null),
    togglePin,
    toggleFavorite,
    archive,
    trash,
    restore,
    deleteForever,
    copy,
    exportMd,
    readAloud,
  }
}
