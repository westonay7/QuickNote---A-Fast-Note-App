import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { Plus, WifiOff } from 'lucide-react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useOnlineStatus } from '@/hooks/useNotesList'
import { usePrefs } from '@/state/PrefsContext'
import { cn } from '@/lib/format'

/**
 * Persistent application layout: sidebar (desktop) / drawer (mobile),
 * top header, offline banner, and the routed workspace.
 */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { prefs, update } = usePrefs()
  const location = useLocation()
  const [params] = useSearchParams()
  const online = useOnlineStatus()

  // Close the mobile drawer whenever navigation happens
  useEffect(() => setDrawerOpen(false), [location.pathname, location.search])

  // Close drawer on Escape
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const isEditingNote = location.pathname.includes('/notes/new') || /\/notes\/[^/]+/.test(location.pathname)

  return (
    <div className="flex min-h-screen bg-canvas dark:bg-canvas-dark">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar
          collapsed={prefs.sidebarCollapsed}
          onToggleCollapse={() => update({ sidebarCollapsed: !prefs.sidebarCollapsed })}
        />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 animate-slide-in-right">
            <Sidebar variant="drawer" collapsed={false} onToggleCollapse={() => undefined} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenDrawer={() => setDrawerOpen(true)} searchQuery={params.get('q') ?? ''} />

        {!online && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-1.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            You're offline — changes will save once you reconnect.
          </div>
        )}

        <main
          id="main-content"
          className={cn('mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-safe')}
        >
          <Outlet />
        </main>

        {/* Mobile floating action button (Android note creation shortcut) */}
        {!isEditingNote && (
          <Link
            to="/app/notes/new"
            aria-label="Create new note"
            title="Create new note"
            className="fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop transition hover:bg-brand-700 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 lg:hidden"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}
