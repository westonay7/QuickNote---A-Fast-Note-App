import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  FileText,
  FolderOpen,
  MoreVertical,
  Pin,
  PinOff,
  RotateCcw,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react'
import { cn, notePreview, relativeTime } from '@/lib/format'
import type { NoteWithRefs } from '@/lib/types'
import { Badge } from './ui'
import { Menu } from './Menu'

interface NoteCardProps {
  note: NoteWithRefs
  view?: 'grid' | 'list'
  compact?: boolean
  showFolder?: boolean
  /** Handlers — missing handlers hide their menu item, so no dead buttons exist. */
  onTogglePin?: (note: NoteWithRefs) => void
  onToggleFavorite?: (note: NoteWithRefs) => void
  onArchive?: (note: NoteWithRefs) => void
  onRestore?: (note: NoteWithRefs) => void
  onTrash?: (note: NoteWithRefs) => void
  onDeleteForever?: (note: NoteWithRefs) => void
  onCopy?: (note: NoteWithRefs) => void
  onExport?: (note: NoteWithRefs) => void
  onReadAloud?: (note: NoteWithRefs) => void
}

export function NoteCard({
  note,
  view = 'grid',
  compact = false,
  showFolder = true,
  onTogglePin,
  onToggleFavorite,
  onArchive,
  onRestore,
  onTrash,
  onDeleteForever,
  onCopy,
  onExport,
  onReadAloud,
}: NoteCardProps) {
  const inTrash = Boolean(note.deleted_at)

  // Trash notes are read-only previews; live notes open in the editor.
  const overlay = inTrash ? (
    <span className="absolute inset-0" aria-hidden />
  ) : (
    <Link
      to={`/app/notes/${note.id}`}
      className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      aria-label={`Open note ${note.title || 'Untitled note'}`}
    />
  )

  const menuItems = [
    onTogglePin && {
      label: note.is_pinned ? 'Unpin note' : 'Pin note',
      icon: note.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />,
      onSelect: () => onTogglePin(note),
    },
    onToggleFavorite && {
      label: note.is_favorite ? 'Remove favorite' : 'Add to favorites',
      icon: <Star className={cn('h-4 w-4', note.is_favorite && 'fill-amber-400 text-amber-500')} />,
      onSelect: () => onToggleFavorite(note),
    },
    !inTrash &&
      onArchive && {
        label: note.is_archived ? 'Unarchive' : 'Archive',
        icon: note.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />,
        onSelect: () => onArchive(note),
      },
    onCopy && {
      label: 'Copy content',
      icon: <Copy className="h-4 w-4" />,
      onSelect: () => onCopy(note),
    },
    onReadAloud && {
      label: 'Read aloud',
      icon: <Volume2 className="h-4 w-4" />,
      onSelect: () => onReadAloud(note),
    },
    onExport && {
      label: 'Download as Markdown',
      icon: <Download className="h-4 w-4" />,
      onSelect: () => onExport(note),
    },
    inTrash &&
      onRestore && {
        label: 'Restore note',
        icon: <RotateCcw className="h-4 w-4" />,
        onSelect: () => onRestore(note),
      },
    !inTrash &&
      onTrash && {
        label: 'Move to Trash',
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        onSelect: () => onTrash(note),
      },
    inTrash &&
      onDeleteForever && {
        label: 'Delete permanently',
        icon: <Trash2 className="h-4 w-4" />,
        danger: true,
        onSelect: () => onDeleteForever(note),
      },
  ].filter(Boolean) as { label: string; icon: ReactNode; onSelect: () => void; danger?: boolean }[]

  const cardBody = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            'min-w-0 flex-1 truncate font-semibold text-zinc-900 dark:text-zinc-100',
            compact ? 'text-sm' : 'text-[0.95rem]',
          )}
          title={note.title || 'Untitled note'}
        >
          {note.title || 'Untitled note'}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          {note.is_pinned && (
            <span title="Pinned" className="text-brand-600 dark:text-brand-400">
              <Pin className="h-3.5 w-3.5 fill-current" aria-label="Pinned" />
            </span>
          )}
          {note.is_favorite && (
            <span title="Favorite">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-label="Favorite" />
            </span>
          )}
          {menuItems.length > 0 && (
            <Menu
              align="right"
              label={`Actions for ${note.title || 'Untitled note'}`}
              items={menuItems}
              trigger={(props) => (
                <button
                  {...props}
                  type="button"
                  aria-label={`Actions for ${note.title || 'Untitled note'}`}
                  className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
              )}
            />
          )}
        </div>
      </div>

      {!compact && (
        <p className={cn('mt-1.5 leading-relaxed text-zinc-500 dark:text-zinc-400', view === 'grid' ? 'line-clamp-3 text-sm' : 'line-clamp-2 text-sm')}>
          {notePreview(note.content)}
        </p>
      )}

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} tone="brand">
              #{tag.name}
            </Badge>
          ))}
          {note.tags.length > 3 && <Badge>+{note.tags.length - 3}</Badge>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
        <span className="tabular-nums">{relativeTime(note.updated_at)}</span>
        {showFolder && note.folder_name && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <FolderOpen className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{note.folder_name}</span>
            </span>
          </>
        )}
        {note.is_archived && (
          <>
            <span aria-hidden>·</span>
            <Badge tone="warning">Archived</Badge>
          </>
        )}
      </div>
    </>
  )

  if (view === 'list') {
    return (
      <article className="card group relative p-4 transition-shadow hover:shadow-raised">
        {overlay}
        <div className={cn('pointer-events-none [&_button]:pointer-events-auto', compact ? 'min-h-0' : 'min-h-14')}>{cardBody}</div>
      </article>
    )
  }

  return (
    <article className="card group relative flex flex-col p-4 transition-shadow hover:shadow-raised">
      {overlay}
      <div className={cn('pointer-events-none flex flex-1 flex-col [&_button]:pointer-events-auto')}>
        {cardBody}
        {!note.content && !note.title && (
          <span className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
            <FileText className="h-3 w-3" aria-hidden /> Empty note
          </span>
        )}
      </div>
    </article>
  )
}
