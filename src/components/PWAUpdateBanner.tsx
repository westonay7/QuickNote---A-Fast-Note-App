import { RefreshCw, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { usePWAUpdate } from '@/state/PWAUpdateContext'

/**
 * PWA Update Notification Banner.
 * Appears when a new version of the app is detected from Cloudflare / production.
 * Allows the user on mobile or desktop to tap "Update Now" to apply changes immediately.
 */
export function PWAUpdateBanner() {
  const { updateAvailable, isUpdating, applyUpdate } = usePWAUpdate()
  const [dismissed, setDismissed] = useState(false)

  if (!updateAvailable || dismissed) {
    return null
  }

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-brand-300 bg-white/95 p-4 shadow-pop backdrop-blur-md dark:border-brand-700 dark:bg-zinc-900/95"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
          <Sparkles className="h-5 w-5 animate-pulse" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Update Available
            </h2>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss update notification"
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            A new version of QuickNote is ready with the latest changes and improvements.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={applyUpdate}
              disabled={isUpdating}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} aria-hidden />
              {isUpdating ? 'Updating…' : 'Update Now'}
            </button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
