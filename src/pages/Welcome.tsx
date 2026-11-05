import { Link } from 'react-router-dom'
import { ArrowRight, Check, FolderTree, Search, Timer, WifiOff } from 'lucide-react'
import { Logo, NoteGlyph } from '@/components/Logo'
import { PWAInstallButton } from '@/components/PWAInstallExperience'

const BENEFITS = [
  { icon: Timer, text: 'Capture notes quickly.' },
  { icon: FolderTree, text: 'Keep everything organized.' },
  { icon: Search, text: 'Find notes instantly.' },
  { icon: WifiOff, text: 'Access your notes across supported devices.' },
]

export function Welcome() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas dark:bg-canvas-dark">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <PWAInstallButton
            variant="header"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 shadow-xs transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/70 dark:text-brand-300"
          />
          <Link
            to="/signin"
            className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/70 dark:text-brand-300">
          <NoteGlyph size={16} />
          QuickNote — Capture your thoughts. Keep everything organized.
        </span>

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-5xl lg:text-6xl">
          Your thoughts,{' '}
          <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-violet-400">
            organized.
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg">
          Capture ideas, organize your notes, and find what matters whenever you need it.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/introduction"
            className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-7 text-[0.95rem] font-semibold text-white shadow-raised transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            Get Started
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/signin"
            className="inline-flex h-12 items-center rounded-xl border border-zinc-200 bg-white px-7 text-[0.95rem] font-medium text-zinc-700 shadow-soft transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200 dark:hover:bg-white/5"
          >
            Sign In
          </Link>
        </div>

        {/* Benefits */}
        <ul className="mt-12 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="card flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <p className="mt-8 flex items-center gap-1.5 text-xs text-zinc-400">
          <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Private by design — your notes belong to you and are protected by database security policies.
        </p>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-6 text-xs text-zinc-400 sm:px-6">
        <span>© {new Date().getFullYear()} QuickNote</span>
        <Link to="/legal/privacy" className="transition hover:text-zinc-600 dark:hover:text-zinc-300">
          Privacy Policy
        </Link>
        <Link to="/legal/terms" className="transition hover:text-zinc-600 dark:hover:text-zinc-300">
          Terms of Service
        </Link>
      </footer>
    </div>
  )
}
