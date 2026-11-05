import { DEFAULT_PREFERENCES, type AppPreferences } from './types'

/**
 * Local preferences are NON-SENSITIVE UI settings only
 * (theme, sort defaults, density…). Private note content and credentials are
 * never written to localStorage — notes live in Supabase and the session is
 * managed by Supabase Auth (httpOnly-free but documented in README).
 */
const KEY = 'quicknote:prefs:v1'

export function loadPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<AppPreferences>
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function savePreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    /* storage may be unavailable (private mode) — preferences simply won't persist */
  }
}

export function clearPreferences(): void {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem('quicknote:draft')
  } catch {
    /* ignore */
  }
}

/** Unsaved editor drafts (temporary, cleared on successful save). */
export interface Draft {
  title: string
  content: string
  folderId: string | null
  tagIds: string[]
  savedAt: string
}

const DRAFT_KEY = 'quicknote:draft'

export function loadDraft(noteId: string): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { noteId: string; draft: Draft }
    return parsed.noteId === noteId ? parsed.draft : null
  } catch {
    return null
  }
}

export function saveDraft(noteId: string, draft: Draft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ noteId, draft }))
  } catch {
    /* ignore quota errors */
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}
