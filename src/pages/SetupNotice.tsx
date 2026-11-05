import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCopy, ExternalLink, Terminal } from 'lucide-react'
import { Logo, NoteGlyph } from '@/components/Logo'
import { Button } from '@/components/ui'

const ENV_SNIPPET = `VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`

/**
 * Shown instead of the app when Supabase credentials are missing.
 * Never fakes functionality — it explains exactly what must be configured.
 */
export function SetupNotice() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ENV_SNIPPET)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10 dark:bg-canvas-dark">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <span className="flex flex-col items-center gap-3">
            <NoteGlyph size={48} />
            <Logo />
          </span>
        </div>

        <div className="card p-6 sm:p-8 animate-slide-up">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Connect your Supabase project to run QuickNote
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            The interface is built, but real accounts and note storage need a Supabase project.
            Nothing is faked — follow the three steps below and the full app unlocks.
          </p>

          <ol className="mt-6 space-y-5">
            <li>
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[0.7rem] text-white">1</span>
                Create a Supabase project
              </p>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                At{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  supabase.com/dashboard <ExternalLink className="h-3 w-3" aria-hidden />
                </a>{' '}
                (free tier is fine), then open <strong>SQL Editor</strong> and run the migration
                file <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-white/10">supabase/migrations/0001_quicknote.sql</code>{' '}
                from this repository.
              </p>
            </li>
            <li>
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[0.7rem] text-white">2</span>
                Create <code>.env</code> from the template
              </p>
              <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-950 p-4 dark:border-white/10">
                <pre className="scroll-area overflow-x-auto text-xs leading-relaxed text-emerald-300">
                  <code>{`cp .env.example .env`}</code>
                </pre>
              </div>
              <div className="relative mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
                <pre className="scroll-area overflow-x-auto text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                  <code>{ENV_SNIPPET}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => void copy()}
                  aria-label="Copy environment variable template"
                  className="absolute top-2 right-2 rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 transition hover:text-zinc-800 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <ClipboardCopy className="h-4 w-4" aria-hidden />
                </button>
                {copied && (
                  <span role="status" className="absolute right-12 top-3 text-xs font-medium text-emerald-600">
                    Copied
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Find both values in Supabase Dashboard → Project Settings → API. Use the{' '}
                <strong>anon/public</strong> key — never the service-role key.
              </p>
            </li>
            <li>
              <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[0.7rem] text-white">3</span>
                Restart the dev server
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
                <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <code>npm run dev</code>
              </div>
            </li>
          </ol>

          <div className="mt-7 flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>I've configured it — reload</Button>
            <Link
              to="/"
              className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
            >
              View welcome screen
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          Full setup instructions: <code className="rounded bg-zinc-200/60 px-1 py-0.5 dark:bg-white/10">README.md</code>
        </p>
      </div>
    </div>
  )
}
