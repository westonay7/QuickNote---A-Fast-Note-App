import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Compass, FolderTree, PenLine, Rocket, SearchCheck, SkipForward } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/format'
import { useAuth } from '@/state/AuthContext'
import { usePrefs } from '@/state/PrefsContext'

const STEPS = [
  {
    icon: PenLine,
    title: 'Capture your ideas',
    body: 'Write down thoughts, reminders, meeting notes and study notes the moment they happen. QuickNote autosaves as you type, so you never lose a word.',
    points: ['Rich, comfortable writing area', 'Autosave with clear Saving / Saved states', 'Draft recovery if a save is interrupted'],
  },
  {
    icon: FolderTree,
    title: 'Organize everything',
    body: 'Keep your workspace tidy with folders and tags, and surface what matters most using pins, favorites and archiving.',
    points: ['Folders with note counts', 'Color-coded tags you can filter by', 'Pin, favorite, archive — or move notes to Trash'],
  },
  {
    icon: SearchCheck,
    title: 'Find notes quickly',
    body: 'Search titles, content, tags and folders at once, then narrow results with sorting and filters. Recent notes are always one click away.',
    points: ['Instant full search', 'Five sort orders + smart filters', 'Recently updated notes on your dashboard'],
  },
]

export function Onboarding() {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { prefs, update } = usePrefs()

  // Returning users skip the tutorial entirely
  if (prefs.onboardingDone) {
    return <Navigate to={isAuthenticated ? '/app' : '/signup'} replace />
  }

  const step = STEPS[index]
  const isLast = index === STEPS.length - 1
  const Icon = step.icon

  const finish = () => {
    update({ onboardingDone: true })
    navigate(isAuthenticated ? '/app' : '/signup', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas dark:bg-canvas-dark">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size="sm" to="/app" />
        <button
          type="button"
          onClick={finish}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
        >
          Skip
          <SkipForward className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 pb-16">
        {/* Progress */}
        <div className="mb-8 flex w-full items-center gap-2" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i <= index ? 'bg-brand-600' : 'bg-zinc-200 dark:bg-white/10',
              )}
            />
          ))}
        </div>

        <div className="card w-full px-6 py-10 text-center sm:px-10 sm:py-12 animate-slide-up" key={index}>
          <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-raised">
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase dark:text-brand-400">
            Step {index + 1} of {STEPS.length}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {step.title}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-[0.95rem]">
            {step.body}
          </p>
          <ul className="mx-auto mt-6 max-w-md space-y-2.5 text-left">
            {step.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <Compass className="h-3 w-3" aria-hidden />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Controls */}
        <div className="mt-8 flex w-full items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200 dark:hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>

          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === index ? 'w-5 bg-brand-600' : 'w-2 bg-zinc-300 dark:bg-zinc-600',
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={finish}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Get Started
              <Rocket className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-600 px-6 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Next
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
