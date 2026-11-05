/** Database row types + shared app types for QuickNote. */

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Folder {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  note_count?: number
}

export interface Tag {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  folder_id: string | null
  is_pinned: boolean
  is_favorite: boolean
  is_archived: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  last_opened_at: string | null
  version: number
}

/** A note enriched with its folder and tags for list views. */
export interface NoteWithRefs extends Note {
  tags: Tag[]
  folder_name: string | null
}

export type SortKey =
  | 'updated_desc'
  | 'updated_asc'
  | 'created_desc'
  | 'created_asc'
  | 'title_asc'
  | 'title_desc'

export type ViewMode = 'grid' | 'list'

export type NoteScope =
  | 'all'
  | 'pinned'
  | 'favorites'
  | 'recent'
  | 'archived'
  | 'trash'
  | 'folder'
  | 'tag'

export interface AppPreferences {
  theme: 'light' | 'dark' | 'system'
  fontScale: 'sm' | 'md' | 'lg'
  density: 'comfortable' | 'compact'
  reduceMotion: boolean
  defaultSort: SortKey
  defaultView: ViewMode
  defaultFolderId: string | null
  autosave: boolean
  stayAfterSave: boolean
  onboardingDone: boolean
  sidebarCollapsed: boolean
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: 'system',
  fontScale: 'md',
  density: 'comfortable',
  reduceMotion: false,
  defaultSort: 'updated_desc',
  defaultView: 'grid',
  defaultFolderId: null,
  autosave: true,
  stayAfterSave: true,
  onboardingDone: false,
  sidebarCollapsed: false,
}
