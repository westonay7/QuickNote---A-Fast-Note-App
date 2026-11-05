import { getSupabase } from './supabase'
import type { Folder, Note, NoteWithRefs, Profile, SortKey, Tag } from './types'

/* ------------------------------------------------------------------ */
/* Normalization helpers                                              */
/* ------------------------------------------------------------------ */

interface NoteRow {
  folder?: { name: string } | { name: string }[] | null
  note_tags?: { tag: Tag | Tag[] | null }[] | null
  [key: string]: unknown
}

function normalize(raw: NoteRow): NoteWithRefs {
  const folderArr = Array.isArray(raw.folder) ? raw.folder[0] : raw.folder
  const tags = (raw.note_tags ?? [])
    .map((nt) => (Array.isArray(nt.tag) ? nt.tag[0] : nt.tag))
    .filter((t): t is Tag => Boolean(t))
  const { folder: _f, note_tags: _nt, ...note } = raw
  return { ...(note as unknown as Note), tags, folder_name: folderArr?.name ?? null }
}

const NOTE_SELECT = '*, folder:folders!notes_folder_id_fkey(name), note_tags(tag:tags(*))'

function throwOnError<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/* ------------------------------------------------------------------ */
/* Notes                                                              */
/* ------------------------------------------------------------------ */

export type NoteListScope = 'all' | 'pinned' | 'favorites' | 'recent' | 'archived' | 'trash'

const PAGE_SIZE = 60

interface NoteQueryBuilder {
  order: (
    c: string,
    o: { ascending: boolean },
  ) => {
    range: (
      a: number,
      b: number,
    ) => PromiseLike<{ data: NoteRow[]; error: { message: string } | null }>
  }
  eq: (c: string, v: unknown) => NoteQueryBuilder
}

function scopeQuery(scope: NoteListScope): NoteQueryBuilder {
  const sb = getSupabase()
  let q: any = sb.from('notes').select(NOTE_SELECT)
  if (scope === 'trash') {
    q = q.not('deleted_at', 'is', null)
  } else {
    q = q.is('deleted_at', null)
    q = scope === 'archived' ? q.eq('is_archived', true) : q.eq('is_archived', false)
    if (scope === 'pinned') q = q.eq('is_pinned', true)
    if (scope === 'favorites') q = q.eq('is_favorite', true)
  }
  return q
}

const SORT_MAP: Record<SortKey, [string, boolean]> = {
  updated_desc: ['updated_at', false],
  updated_asc: ['updated_at', true],
  created_desc: ['created_at', false],
  created_asc: ['created_at', true],
  title_asc: ['title', true],
  title_desc: ['title', false],
}

export async function fetchNotes(
  scope: NoteListScope,
  sort: SortKey = 'updated_desc',
  page = 0,
  folderId?: string | null,
  tagId?: string | null,
): Promise<{ notes: NoteWithRefs[]; hasMore: boolean }> {
  const [col, ascending] = SORT_MAP[sort]
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  if (tagId) {
    const sb = getSupabase()
    const rel = throwOnError(await sb.from('note_tags').select('note_id').eq('tag_id', tagId).limit(2000))
    const ids = [...new Set(rel.map((r) => r.note_id as string))]
    if (ids.length === 0) return { notes: [], hasMore: false }
    let nq: any = sb.from('notes').select(NOTE_SELECT).in('id', ids)
    if (scope === 'trash') nq = nq.not('deleted_at', 'is', null)
    else {
      nq = nq.is('deleted_at', null)
      nq = scope === 'archived' ? nq.eq('is_archived', true) : nq.eq('is_archived', false)
      if (scope === 'pinned') nq = nq.eq('is_pinned', true)
      if (scope === 'favorites') nq = nq.eq('is_favorite', true)
    }
    if (folderId) nq = nq.eq('folder_id', folderId)
    const { data, error } = await nq.order(col, { ascending }).range(from, to)
    if (error) throw new Error(error.message)
    const notes = (data as NoteRow[]).map(normalize)
    return { notes, hasMore: data.length === PAGE_SIZE }
  }

  let q = scopeQuery(scope)
  if (folderId) q = q.eq('folder_id', folderId)
  const { data, error } = await q.order(col, { ascending }).range(from, to)
  if (error) throw new Error(error.message)
  const notes = (data as NoteRow[]).map(normalize)
  return { notes, hasMore: data.length === PAGE_SIZE }
}

export async function getNote(id: string): Promise<NoteWithRefs | null> {
  const sb = getSupabase()
  const data = throwOnError(await sb.from('notes').select(NOTE_SELECT).eq('id', id).maybeSingle())
  if (!data) return null
  return normalize(data as NoteRow)
}

/** Marks a note as recently accessed (best-effort; never blocks the reader). */
export async function touchNote(id: string): Promise<void> {
  try {
    const sb = getSupabase()
    await sb.from('notes').update({ last_opened_at: new Date().toISOString() }).eq('id', id)
  } catch {
    /* tracking is optional */
  }
}

export interface NoteInput {
  title: string
  content: string
  folder_id: string | null
  is_pinned?: boolean
  is_favorite?: boolean
  is_archived?: boolean
}

export async function createNote(input: NoteInput, tagIds: string[] = []): Promise<NoteWithRefs> {
  const sb = getSupabase()
  const data = throwOnError<NoteRow>(
    await sb.from('notes').insert({ ...input, deleted_at: null }).select(NOTE_SELECT).single(),
  )
  const note = normalize(data)
  if (tagIds.length) await setNoteTags(note.id, tagIds)
  return tagIds.length ? { ...(await getNote(note.id))! } : note
}

export type NotePatch = Partial<NoteInput> & { deleted_at?: string | null }

export type UpdateResult = { ok: true; note: NoteWithRefs } | { ok: false; conflict: boolean }

/**
 * Optimistic-concurrency update: the row is only written when `version`
 * still matches, so two devices can never silently overwrite each other.
 */
export async function updateNote(
  id: string,
  patch: NotePatch,
  expectedVersion: number,
): Promise<UpdateResult> {
  const sb = getSupabase()
  const data = throwOnError(
    await sb
      .from('notes')
      .update({ ...patch, updated_at: new Date().toISOString(), version: expectedVersion + 1 })
      .eq('id', id)
      .eq('version', expectedVersion)
      .select(NOTE_SELECT)
      .maybeSingle(),
  )
  if (!data) return { ok: false, conflict: true }
  return { ok: true, note: normalize(data as NoteRow) }
}

/** Convenience wrapper for small toggles (pin/favorite/archive/move). */
export async function patchNote(id: string, patch: NotePatch): Promise<NoteWithRefs> {
  const current = await getNote(id)
  if (!current) throw new Error('Note not found')
  const res = await updateNote(id, patch, current.version)
  if (!res.ok) return { ...current, ...patch }
  return res.note
}

/** Soft delete → Trash. */
export async function trashNote(id: string): Promise<void> {
  const sb = getSupabase()
  throwOnError(
    await sb.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id'),
  )
}

export async function restoreNote(id: string): Promise<NoteWithRefs> {
  return patchNote(id, { deleted_at: null })
}

export async function permanentDelete(id: string): Promise<void> {
  const sb = getSupabase()
  throwOnError(await sb.from('notes').delete().eq('id', id).select('id'))
}

export async function emptyTrash(): Promise<void> {
  const sb = getSupabase()
  throwOnError(await sb.from('notes').delete().not('deleted_at', 'is', null).select('id'))
}

/** Server-backed search across title, body, tags and folder names. */
export async function searchNotes(term: string): Promise<NoteWithRefs[]> {
  const clean = term.trim().replace(/[%,.()']/g, ' ').replace(/\s+/g, ' ').slice(0, 100)
  if (!clean) return []
  const sb = getSupabase()
  const pattern = `%${clean}%`

  const direct = throwOnError(
    await sb
      .from('notes')
      .select(NOTE_SELECT)
      .is('deleted_at', null)
      .or(`title.ilike.${pattern},content.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(100),
  ) as NoteRow[]

  // Matching tag names -> note ids
  const tags = throwOnError(
    await sb.from('tags').select('id').ilike('name', pattern).limit(50),
  ) as { id: string }[]
  let viaTag: NoteRow[] = []
  if (tags.length) {
    const rel = throwOnError(
      await sb.from('note_tags').select('note_id').in(
        'tag_id',
        tags.map((t) => t.id),
      ),
    ) as { note_id: string }[]
    const ids = [...new Set(rel.map((r) => r.note_id))]
    if (ids.length) {
      viaTag = throwOnError(
        await sb.from('notes').select(NOTE_SELECT).is('deleted_at', null).in('id', ids).limit(100),
      ) as NoteRow[]
    }
  }

  // Matching folder names -> notes inside them
  const folders = throwOnError(
    await sb.from('folders').select('id').ilike('name', pattern).limit(50),
  ) as { id: string }[]
  let viaFolder: NoteRow[] = []
  if (folders.length) {
    viaFolder = throwOnError(
      await sb
        .from('notes')
        .select(NOTE_SELECT)
        .is('deleted_at', null)
        .in(
          'folder_id',
          folders.map((f) => f.id),
        )
        .limit(100),
    ) as NoteRow[]
  }

  const merged = new Map<string, NoteWithRefs>()
  for (const row of [...direct, ...viaTag, ...viaFolder]) {
    const note = normalize(row)
    if (!note.is_archived) merged.set(note.id, note)
  }
  return [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export interface DashboardCounts {
  active: number
  pinned: number
  favorite: number
  folders: number
}

export async function fetchDashboardCounts(): Promise<DashboardCounts> {
  const sb = getSupabase()
  const [active, pinned, favorite, folders] = await Promise.all([
    sb.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_archived', false),
    sb.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_pinned', true),
    sb.from('notes').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_favorite', true),
    sb.from('folders').select('id', { count: 'exact', head: true }),
  ])
  if (active.error) throw new Error(active.error.message)
  return {
    active: active.count ?? 0,
    pinned: pinned.count ?? 0,
    favorite: favorite.count ?? 0,
    folders: folders.count ?? 0,
  }
}

/* ------------------------------------------------------------------ */
/* Note ↔ tag relationship                                            */
/* ------------------------------------------------------------------ */

export async function setNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  const sb = getSupabase()
  throwOnError(await sb.from('note_tags').delete().eq('note_id', noteId))
  if (tagIds.length) {
    throwOnError(
      await sb.from('note_tags').insert(tagIds.map((tag_id) => ({ note_id: noteId, tag_id }))),
    )
  }
}

/* ------------------------------------------------------------------ */
/* Folders                                                            */
/* ------------------------------------------------------------------ */

export async function fetchFolders(): Promise<Folder[]> {
  const sb = getSupabase()
  const data = throwOnError(
    await sb.from('folders').select('*, notes!notes_folder_id_fkey(count)').order('name', { ascending: true }),
  )
  return (data as (Folder & { notes: { count: number }[] })[]).map((f) => ({
    ...f,
    note_count: f.notes?.[0]?.count ?? 0,
  }))
}

export async function createFolder(name: string): Promise<Folder> {
  const sb = getSupabase()
  return throwOnError(await sb.from('folders').insert({ name: name.trim() }).select('*').single())
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  const sb = getSupabase()
  return throwOnError(
    await sb.from('folders').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', id).select('*').single(),
  )
}

/**
 * Deleting a folder NEVER destroys notes: they are moved to the chosen
 * destination (default: no folder / "Uncategorized") via a single UPDATE.
 */
export async function deleteFolder(id: string, moveToFolderId: string | null): Promise<void> {
  const sb = getSupabase()
  throwOnError(await sb.from('notes').update({ folder_id: moveToFolderId }).eq('folder_id', id).select('id'))
  throwOnError(await sb.from('folders').delete().eq('id', id).select('id'))
}

/* ------------------------------------------------------------------ */
/* Tags                                                               */
/* ------------------------------------------------------------------ */

export async function fetchTags(): Promise<Tag[]> {
  const sb = getSupabase()
  return throwOnError(await sb.from('tags').select('*').order('name', { ascending: true }))
}

export async function createTag(name: string): Promise<Tag> {
  const sb = getSupabase()
  return throwOnError(await sb.from('tags').insert({ name: name.trim().toLowerCase() }).select('*').single())
}

export async function deleteTag(id: string): Promise<void> {
  const sb = getSupabase()
  throwOnError(await sb.from('tags').delete().eq('id', id).select('id'))
}

/* ------------------------------------------------------------------ */
/* Profile & account                                                  */
/* ------------------------------------------------------------------ */

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase()
  return throwOnError(await sb.from('profiles').select('*').eq('id', userId).maybeSingle())
}

export async function updateProfile(userId: string, fullName: string): Promise<Profile> {
  const sb = getSupabase()
  return throwOnError(
    await sb
      .from('profiles')
      .update({ full_name: fullName.trim(), updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single(),
  )
}

/** Re-authenticates with current credentials before a sensitive change. */
export async function reauthenticate(email: string, currentPassword: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.auth.signInWithPassword({ email, password: currentPassword })
  if (error) throw new Error('Current password is incorrect.')
}

export async function changePassword(newPassword: string): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/** Deletes all of the current user's data + the account (SQL SECURITY DEFINER RPC). */
export async function deleteAccount(): Promise<void> {
  const sb = getSupabase()
  const { error } = await sb.rpc('delete_my_account')
  if (error) throw new Error(error.message)
  await sb.auth.signOut()
}
