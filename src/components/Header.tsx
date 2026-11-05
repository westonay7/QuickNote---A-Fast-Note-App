import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu as MenuIcon, Moon, Plus, Search, Settings as SettingsIcon, Sun, UserRound } from 'lucide-react'
import { Menu } from '@/components/Menu'
import { NoteGlyph } from '@/components/Logo'
import { PWAInstallButton } from '@/components/PWAInstallExperience'
import { initials, cn } from '@/lib/format'
import { useAuth } from '@/state/AuthContext'
import { usePrefs } from '@/state/PrefsContext'

function titleFor(pathname: string): string {
  if (pathname === '/app') return 'Dashboard'
  if (pathname.startsWith('/app/search')) return 'Search'
  if (pathname.startsWith('/app/notes/new')) return 'New Note'
  if (/\/app\/notes\/[^/]+/.test(pathname)) return 'Note'
  if (pathname.startsWith('/app/notes')) return 'All Notes'
  if (pathname.startsWith('/app/pinned')) return 'Pinned Notes'
  if (pathname.startsWith('/app/favorites')) return 'Favorites'
  if (pathname.startsWith('/app/recent')) return 'Recent Notes'
  if (pathname.startsWith('/app/folders')) return 'Folders'
  if (pathname.startsWith('/app/tags')) return 'Tags'
  if (pathname.startsWith('/app/archived')) return 'Archived'
  if (pathname.startsWith('/app/trash')) return 'Trash'
  if (pathname.startsWith('/app/settings')) return 'Settings'
  if (pathname.startsWith('/app/help')) return 'Help & Support'
  if (pathname.startsWith('/app/feedback')) return 'Feedback'
  if (pathname.startsWith('/app/profile')) return 'Profile'
  return 'QuickNote'
}

export function Header({ onOpenDrawer, searchQuery }: { onOpenDrawer: () => void; searchQuery: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { update } = usePrefs()
  const [query, setQuery] = useState(searchQuery)

  useEffect(() => setQuery(searchQuery), [searchQuery, location.pathname])

  const dark = document.documentElement.classList.contains('dark')
  const name = profile?.full_name || 'Your account'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/app/search?q=${encodeURIComponent(q)}` : '/app/search')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-surface-dark/85">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        {/* Mobile: drawer trigger + brand */}
        <button
          type="button"
          onClick={onOpenDrawer}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10 lg:hidden"
        >
          <MenuIcon className="h-5 w-5" aria-hidden />
        </button>
        <Link to="/app" className="flex items-center gap-2 lg:hidden" aria-label="QuickNote dashboard">
          <NoteGlyph size={28} />
        </Link>

        <h1 className="hidden text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 lg:block">
          {titleFor(location.pathname)}
        </h1>

        {/* Search — full width on mobile after the icons, fixed on desktop */}
        <form onSubmit={submit} role="search" className="ml-auto min-w-0 flex-1 sm:ml-4 sm:max-w-md lg:max-w-lg">
          <label htmlFor="global-search" className="sr-only">
            Search notes
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-4 w-4 text-zinc-400"
              aria-hidden
            />
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, tags, folders…"
              className={cn(
                'h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm text-zinc-900 transition-colors',
                'placeholder:text-zinc-400 focus:border-brand-400 focus:bg-white focus:outline-2 focus:outline-brand-500/30',
                'dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-white/10',
              )}
            />
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* In-app install button (PWA) */}
          <PWAInstallButton
            variant="header"
            className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 shadow-xs transition hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/70 dark:text-brand-300 dark:hover:bg-brand-900/70"
          />

          {/* Quick-create */}
          <Link
            to="/app/notes/new"
            aria-label="Create new note"
            title="Create new note"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 sm:px-4"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">New Note</span>
          </Link>

          {/* Theme toggle (light/dark quick switch; system option lives in Settings) */}
          <button
            type="button"
            onClick={() => update({ theme: dark ? 'light' : 'dark' })}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg p-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          >
            {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
          </button>

          {/* Profile menu */}
          <Menu
            label="Account menu"
            align="right"
            items={[
              { label: 'Profile', icon: <UserRound className="h-4 w-4" />, onSelect: () => navigate('/app/profile') },
              {
                label: 'Settings',
                icon: <SettingsIcon />,
                onSelect: () => navigate('/app/settings'),
              },
              {
                label: 'Sign out',
                icon: <LogOut className="h-4 w-4" />,
                danger: true,
                onSelect: () => void signOut().then(() => navigate('/signin')),
              },
            ]}
            trigger={(props) => (
              <button
                {...props}
                type="button"
                aria-label="Open account menu"
                className="ml-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 transition hover:bg-brand-200 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
              >
                {initials(name)}
              </button>
            )}
          />
        </div>
      </div>
    </header>
  )
}
