import { Link, useParams } from 'react-router-dom'
import { FolderOpen, Tags } from 'lucide-react'
import { NotesView } from '@/components/NotesView'
import { EmptyState, CenterSpinner } from '@/components/ui'
import { useFolders, useTags } from '@/hooks/useCatalog'

export const AllNotesPage = () => <NotesView scope="all" />
export const PinnedPage = () => (
  <NotesView scope="pinned" description="Notes you have pinned stay at the top of your workspace." />
)
export const FavoritesPage = () => (
  <NotesView scope="favorites" description="Everything you have starred, in one place." />
)
export const RecentPage = () => (
  <NotesView
    scope="recent"
    description="Notes you opened or edited most recently — “recent” means the last 30 days."
  />
)
export const ArchivedPage = () => <NotesView scope="archived" showCreate={false} />
export const TrashPage = () => <NotesView scope="trash" showCreate={false} />

export function FolderNotesPage() {
  const { folderId } = useParams()
  const { folders, loading } = useFolders()
  const folder = folders.find((f) => f.id === folderId)

  if (loading) return <CenterSpinner label="Loading folder" />

  if (!folder) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-6 w-6" aria-hidden />}
        title="Folder not found"
        description="It may have been renamed or deleted."
        action={
          <Link
            to="/app/folders"
            className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Back to Folders
          </Link>
        }
      />
    )
  }

  return (
    <NotesView
      scope="folder"
      folderId={folder.id}
      title={folder.name}
      description={`Folder · ${folder.note_count ?? 0} note${(folder.note_count ?? 0) === 1 ? '' : 's'} · Pick a different folder for any note from its editor.`}
      emptyTitle="This folder is empty"
      emptyDescription="Open a note and choose this folder to move it here."
    />
  )
}

export function TagNotesPage() {
  const { tagId } = useParams()
  const { tags, loading } = useTags()
  const tag = tags.find((t) => t.id === tagId)

  if (loading) return <CenterSpinner label="Loading tag" />

  if (!tag) {
    return (
      <EmptyState
        icon={<Tags className="h-6 w-6" aria-hidden />}
        title="Tag not found"
        description="It may have been renamed or removed."
        action={
          <Link
            to="/app/tags"
            className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Back to Tags
          </Link>
        }
      />
    )
  }

  return (
    <NotesView
      scope="tag"
      tagId={tag.id}
      title={`#${tag.name}`}
      description="Every note carrying this tag."
      emptyTitle="No notes with this tag"
      emptyDescription="Open a note and add this tag from the editor."
    />
  )
}
