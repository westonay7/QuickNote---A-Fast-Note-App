import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, Sparkles, Wand2 } from 'lucide-react'
import { Logo, NoteGlyph } from '@/components/Logo'

/**
 * Shared two-column layout for all public/auth screens:
 * brand panel on the left (hidden on small screens), form card on the right.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-canvas dark:bg-canvas-dark">
      {/* Brand panel */}
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex xl:w-1/2">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="relative">
          <Link to="/" aria-label="Back to QuickNote welcome" className="inline-flex items-center gap-2.5">
            <NoteGlyph size={32} />
            <span className="text-lg font-bold tracking-tight text-white">
              Quick<span className="text-brand-200">Note</span>
            </span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="max-w-sm text-2xl font-bold leading-snug">
            Capture your thoughts. Keep everything organized.
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-brand-100">
            <li className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Write, edit and autosave notes with automatic recovery of unsaved drafts.
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Organize everything with folders, tags, pins, favorites and archiving.
            </li>
            <li className="flex items-start gap-3">
              <Wand2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Find anything instantly with fast search, sorting and filters.
            </li>
            <li className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Protected by Supabase Auth and Row Level Security — only you can read your notes.
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-200">QuickNote · Your thoughts, organized.</p>
      </aside>

      {/* Form panel */}
      <div className="flex flex-1 flex-col overflow-y-auto scroll-area">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="lg:hidden">
            <Logo size="sm" />
          </Link>
          <span className="hidden lg:block" />
          <Link
            to="/"
            className="text-xs font-medium text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ← Back to home
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-8">
          <div className="w-full max-w-md animate-slide-up">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
            <div className="mt-7">{children}</div>
            {footer && (
              <div className="mt-6 border-t border-zinc-200 pt-5 text-center text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                {footer}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
