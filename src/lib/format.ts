import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** "just now" · "5 min ago" · "2 hours ago" · "Mar 14" · "Mar 14, 2024" */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export function fullDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function initials(name: string | null | undefined): string {
  const source = (name ?? '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

export function notePreview(content: string, max = 160): string {
  const plain = content.replace(/\s+/g, ' ').trim()
  if (!plain) return 'No content yet.'
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain
}

/** Sensible default title for untitled notes. */
export function defaultTitle(content: string): string {
  const firstLine = content.split(/\n/).map((l) => l.trim()).find(Boolean)
  if (!firstLine) return 'Untitled note'
  const trimmed = firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine
  return trimmed
}

export function wordCount(content: string): number {
  const trimmed = content.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Sanitizes a string before it is interpolated into a PostgREST `or=` filter. */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%,.()']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'note'
}
