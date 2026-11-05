import { useState, useEffect } from 'react'
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { NoteGlyph } from './Logo'

const DISMISS_KEY = 'quicknote_pwa_install_dismissed_until'

/**
 * Android & Mobile-first PWA Install Banner.
 * Automatically appears when the browser triggers beforeinstallprompt or on mobile,
 * and hides once the app is installed or running in standalone mode.
 */
export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(true)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // Check if dismissed recently (within 7 days)
    const stored = localStorage.getItem(DISMISS_KEY)
    if (stored) {
      const until = Number.parseInt(stored, 10)
      if (Date.now() < until) {
        setDismissed(true)
        return
      }
    }
    setDismissed(false)
  }, [])

  if (isInstalled || dismissed) {
    return null
  }

  // Only show on installable browsers or mobile devices (Android / iOS)
  if (!isInstallable && !isAndroid && !isIOS) {
    return null
  }

  const handleDismiss = () => {
    // Dismiss for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    setDismissed(true)
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install()
      if (success) setDismissed(true)
    } else if (isIOS) {
      setShowIOSModal(true)
    }
  }

  return (
    <>
      <aside
        aria-label="Install QuickNote application"
        className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up rounded-2xl border border-brand-200/80 bg-white/95 p-4 shadow-pop backdrop-blur-md dark:border-brand-800/80 dark:bg-zinc-900/95"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 pt-0.5">
            <NoteGlyph size={40} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {isAndroid ? 'Install QuickNote on Android' : 'Install QuickNote'}
              </h2>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss installation prompt"
                className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Get the standalone Android app experience with instant launch, fast note drafting, and
              offline access.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 text-xs font-semibold text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Install App
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* iOS Safari Guided Modal */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 backdrop-blur-xs sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Install on iOS instructions"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-pop dark:bg-surface-dark">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                <Smartphone className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Install on iPhone & iPad
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Safari Home Screen</p>
              </div>
            </div>

            <ol className="mt-4 space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  1
                </span>
                <span>
                  Tap the <Share className="inline h-3.5 w-3.5 mx-0.5" /> <strong>Share</strong> button
                  in Safari's toolbar.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Compact Install Button for Header / Mobile Nav.
 */
export function PWAInstallButton({
  className,
  variant = 'header',
}: {
  className?: string
  variant?: 'header' | 'sidebar' | 'settings'
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Installed (Standalone PWA)
        </span>
      )
    }
    return null
  }

  if (!isInstallable && !isIOS && variant !== 'settings') {
    return null
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install()
    } else if (isIOS) {
      setShowIOSModal(true)
    }
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={() => void handleClick()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-white/5"
        >
          <Download className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden />
          <span>Install QuickNote</span>
        </button>
        {showIOSModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-xs rounded-xl bg-white p-5 dark:bg-surface-dark">
              <h4 className="text-sm font-semibold">Install on iOS</h4>
              <p className="mt-2 text-xs text-zinc-500">
                Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="mt-4 w-full rounded-lg bg-brand-600 py-1.5 text-xs font-medium text-white"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        title="Install QuickNote on this device"
        aria-label="Install QuickNote on this device"
        className={
          className ??
          'inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-700 shadow-xs transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/70 dark:text-brand-300 dark:hover:bg-brand-900/70'
        }
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        <span>Install App</span>
      </button>
      {showIOSModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xs rounded-xl bg-white p-5 dark:bg-surface-dark">
            <h4 className="text-sm font-semibold">Install on iOS</h4>
            <p className="mt-2 text-xs text-zinc-500">
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full rounded-lg bg-brand-600 py-1.5 text-xs font-medium text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
