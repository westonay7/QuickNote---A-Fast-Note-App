import { Link } from 'react-router-dom'
import { cn } from '@/lib/format'

/**
 * QuickNote identity — a CSS/SVG note glyph plus wordmark.
 * No external images are required anywhere in the app.
 */
export function NoteGlyph({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-[30%] bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M3 4.5h10M3 8h10M3 11.5h6" />
      </svg>
    </span>
  )
}

export function Logo({
  size = 'md',
  to,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  to?: string
  className?: string
}) {
  const dims = {
    sm: { glyph: 26, text: 'text-[0.95rem]' },
    md: { glyph: 32, text: 'text-lg' },
    lg: { glyph: 44, text: 'text-2xl' },
  }[size]

  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <NoteGlyph size={dims.glyph} />
      <span className={cn('font-bold tracking-tight text-zinc-900 dark:text-white', dims.text)}>
        Quick<span className="text-brand-600 dark:text-brand-400">Note</span>
      </span>
    </span>
  )

  if (to) {
    return (
      <Link to={to} aria-label="QuickNote home" className="rounded-md">
        {content}
      </Link>
    )
  }
  return content
}
