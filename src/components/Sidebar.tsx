import { NavLink } from 'react-router-dom'
import {
  Clock,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Settings,
  Star,
  Tags,
  Trash2,
  User,
  FileText,
  Archive,
} from 'lucide-react'
import { Logo, NoteGlyph } from '@/components/Logo'
import { PWAInstallButton } from '@/components/PWAInstallExperience'
import { cn } from '@/lib/format'
import { initials } from '@/lib/format'
import { useAuth } from '@/state/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

const PRIMARY: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/notes', label: 'All Notes', icon: FileText },
  { to: '/app/pinned', label: 'Pinned Notes', icon: Pin },
  { to: '/app/favorites', label: 'Favorites', icon: Star },
  { to: '/app/recent', label: 'Recent Notes', icon: Clock },
]

const LIBRARY: NavItem[] = [
  { to: '/app/folders', label: 'Folders', icon: FolderOpen },
  { to: '/app/tags', label: 'Tags', icon: Tags },
  { to: '/app/archived', label: 'Archived', icon: Archive },
  { to: '/app/trash', label: 'Trash', icon: Trash2 },
]

const SECONDARY: NavItem[] = [
  { to: '/app/settings', label: 'Settings', icon: Settings },
  { to: '/app/help', label: 'Help & Support', icon: HelpCircle },
  { to: '/app/profile', label: 'Profile', icon: User },
]

function Item({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
          collapsed && 'justify-center px-0 py-2.5',
          isActive
            ? 'bg-brand-600 text-white shadow-soft'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100',
        )
      }
    >
      <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && <span className="sr-only">{item.label}</span>}
    </NavLink>
  )
}

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-2 h-px bg-zinc-200 dark:bg-white/10" aria-hidden />
  return (
    <p className="mt-5 mb-1.5 px-3 text-[0.68rem] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
      {children}
    </p>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate?: () => void
  variant?: 'desktop' | 'drawer'
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate, variant = 'desktop' }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const isDrawer = variant === 'drawer'
  const showLabels = isDrawer || !collapsed
  const name = profile?.full_name || 'Your account'

  const handleSignOut = () => {
    onNavigate?.()
    void signOut()
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-white/10 dark:bg-surface-dark',
        isDrawer ? 'w-72' : collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className={cn('flex h-16 shrink-0 items-center', showLabels ? 'px-4' : 'justify-center px-2')}>
        {showLabels ? <Logo to="/app" /> : <NoteGlyph size={30} />}
      </div>

      <nav className="flex-1 overflow-y-auto scroll-area px-3 pb-4" aria-label="Sections">
        {showLabels ? (
          <p className="sr-only">Main</p>
        ) : null}
        {PRIMARY.map((item) => (
          <Item key={item.to} item={item} collapsed={!showLabels} />
        ))}

        <SectionLabel collapsed={!showLabels}>Library</SectionLabel>
        {LIBRARY.map((item) => (
          <Item key={item.to} item={item} collapsed={!showLabels} />
        ))}

        <SectionLabel collapsed={!showLabels}>Account</SectionLabel>
        {SECONDARY.map((item) => (
          <Item key={item.to} item={item} collapsed={!showLabels} />
        ))}

        {showLabels && (
          <div className="mt-4 pt-2 border-t border-zinc-100 dark:border-white/5">
            <PWAInstallButton variant="sidebar" />
          </div>
        )}
      </nav>

      {/* Footer: user + logout + collapse */}
      <div className="border-t border-zinc-100 p-3 dark:border-white/10">
        <div className={cn('flex items-center gap-2.5', showLabels ? '' : 'flex-col')}>
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
          >
            {initials(name)}
          </span>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{name}</p>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 transition hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              >
                <LogOut className="h-3 w-3" aria-hidden /> Sign out
              </button>
            </div>
          )}
          {!showLabels && (
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-zinc-400 transition hover:text-red-600 dark:hover:text-red-400"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {!isDrawer && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-200 lg:flex"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && 'Collapse'}
          </button>
        )}
      </div>
    </aside>
  )
}
