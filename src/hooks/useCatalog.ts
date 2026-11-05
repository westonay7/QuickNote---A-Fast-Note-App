import { useEffect, useState } from 'react'
import { fetchFolders, fetchTags } from '@/lib/api'
import type { Folder, Tag } from '@/lib/types'
import { useData } from '@/state/DataContext'

export function useFolders() {
  const { version } = useData()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchFolders()
      .then((data) => {
        if (!cancelled) setFolders(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load folders.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  return { folders, loading, error }
}

export function useTags() {
  const { version } = useData()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchTags()
      .then((data) => {
        if (!cancelled) setTags(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load tags.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [version])

  return { tags, loading, error }
}
