import { downloadFile, slugify } from './format'
import type { Folder, NoteWithRefs, Tag } from './types'

/** ---------------------------- Markdown ---------------------------- */

export function noteToMarkdown(note: NoteWithRefs, folderName?: string | null): string {
  const lines: string[] = []
  lines.push(`# ${note.title || 'Untitled note'}`, '')
  const meta: string[] = []
  if (folderName ?? note.folder_name) meta.push(`Folder: ${folderName ?? note.folder_name}`)
  if (note.tags.length) meta.push(`Tags: ${note.tags.map((t) => t.name).join(', ')}`)
  meta.push(`Created: ${note.created_at}`, `Updated: ${note.updated_at}`)
  lines.push(`> ${meta.join(' · ')}`, '', note.content || '_(empty)_', '')
  return lines.join('\n')
}

export function exportNoteMarkdown(note: NoteWithRefs): void {
  downloadFile(`${slugify(note.title)}.md`, noteToMarkdown(note), 'text/markdown')
}

export function exportNotesText(notes: NoteWithRefs[]): void {
  const body = notes
    .map((n) => {
      const tags = n.tags.length ? `Tags: ${n.tags.map((t) => t.name).join(', ')}\n` : ''
      return `=== ${n.title || 'Untitled note'} ===\nFolder: ${n.folder_name ?? 'None'}\n${tags}Updated: ${n.updated_at}\n\n${n.content}\n`
    })
    .join('\n')
  downloadFile(`quicknote-export-${dateStamp()}.txt`, body, 'text/plain')
}

export function exportNotesMarkdown(notes: NoteWithRefs[]): void {
  const body = notes.map((n) => noteToMarkdown(n)).join('\n\n---\n\n')
  downloadFile(`quicknote-export-${dateStamp()}.md`, body, 'text/markdown')
}

/** JSON backup preserving structure: folders, tags, timestamps. */
export function exportNotesJson(
  notes: NoteWithRefs[],
  folders: Folder[],
  tags: Tag[],
  profileName: string,
): void {
  const usedFolderIds = new Set(notes.map((n) => n.folder_id).filter(Boolean))
  const usedTagIds = new Set(notes.flatMap((n) => n.tags.map((t) => t.id)))
  const backup = {
    app: 'QuickNote',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: { fullName: profileName },
    folders: folders.filter((f) => usedFolderIds.has(f.id)).map(({ id, name, created_at }) => ({ id, name, created_at })),
    tags: tags.filter((t) => usedTagIds.has(t.id)).map(({ id, name, created_at }) => ({ id, name, created_at })),
    notes: notes.map((n) => ({
      title: n.title,
      content: n.content,
      folderId: n.folder_id,
      tags: n.tags.map((t) => t.name),
      isPinned: n.is_pinned,
      isFavorite: n.is_favorite,
      isArchived: n.is_archived,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
  }
  downloadFile(`quicknote-backup-${dateStamp()}.json`, JSON.stringify(backup, null, 2), 'application/json')
}

/** ------------------------------ Import ---------------------------- */

export interface ImportResult {
  title: string
  content: string
}

const MAX_IMPORT_BYTES = 512 * 1024 // 512 KB per file

/** Parses .md / .txt files into note drafts. Throws on invalid type/size. */
export async function parseImportFiles(files: File[]): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  for (const file of files) {
    const okType = /\.(md|markdown|txt)$/i.test(file.name)
    if (!okType) throw new Error(`"${file.name}" is not a .md or .txt file.`)
    if (file.size > MAX_IMPORT_BYTES) throw new Error(`"${file.name}" is larger than 512 KB.`)
    const text = await file.text()
    const { title, content } = titleFromText(text, file.name)
    results.push({ title, content })
  }
  return results
}

function titleFromText(text: string, filename: string): { title: string; content: string } {
  const trimmed = text.replace(/\r\n/g, '\n').trim()
  const mdHeading = trimmed.match(/^#\s+(.+)$/m)
  const firstLine = trimmed.split('\n').find((l) => l.trim())
  const fallback = filename.replace(/\.(md|markdown|txt)$/i, '')
  const title = (mdHeading?.[1] ?? firstLine ?? fallback).trim().slice(0, 120)
  const content = mdHeading ? trimmed.replace(mdHeading[0], '').replace(/^\n+/, '') : trimmed
  return { title: title || 'Imported note', content }
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10)
}
