import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/state/AuthContext'

export function NotFound() {
  const { isAuthenticated } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center dark:bg-canvas-dark">
      <Logo />
      <p className="mt-10 text-6xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">404</p>
      <h1 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link
          to={isAuthenticated ? '/app' : '/'}
          className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Home'}
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
        >
          Go back
        </button>
      </div>
    </div>
  )
}
