import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Accessibility,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  MessageSquare,
  Palette,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import { ConfirmDialog, Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { PWAInstallButton } from '@/components/PWAInstallExperience'
import { Badge, Button, Field, Input, SegmentedControl, Select, Switch } from '@/components/ui'
import { useFolders } from '@/hooks/useCatalog'
import { clearPreferences } from '@/lib/prefs'
import {
  createNote,
  deleteAccount,
  fetchNotes,
  type NoteListScope,
} from '@/lib/api'
import {
  exportNotesJson,
  exportNotesMarkdown,
  exportNotesText,
  parseImportFiles,
} from '@/lib/export'
import { formatBytes, initials, relativeTime } from '@/lib/format'
import { friendlyError, supportEmail } from '@/lib/supabase'
import type { SortKey, ViewMode } from '@/lib/types'
import { useAuth } from '@/state/AuthContext'
import { useData } from '@/state/DataContext'
import { usePrefs } from '@/state/PrefsContext'
import { useToast } from '@/state/ToastContext'
import { usePWAUpdate } from '@/state/PWAUpdateContext'

type SectionId =
  | 'appearance'
  | 'account'
  | 'notes'
  | 'privacy'
  | 'notifications'
  | 'accessibility'
  | 'data'
  | 'about'

const SECTION_LIST: { id: SectionId; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'notes', label: 'Note preferences', icon: FileText },
  { id: 'privacy', label: 'Privacy & security', icon: ShieldCheck },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'data', label: 'Data & storage', icon: Database },
  { id: 'about', label: 'Help & information', icon: Info },
]

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card min-w-0 p-4 sm:p-6" aria-label={title}>
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-base">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

async function loadAllNotes(): Promise<Awaited<ReturnType<typeof fetchNotes>>['notes']> {
  const seen = new Map<string, Awaited<ReturnType<typeof fetchNotes>>['notes'][number]>()
  const scopes: NoteListScope[] = ['all', 'archived']
  for (const scope of scopes) {
    for (let page = 0; page < 20; page++) {
      const { notes, hasMore } = await fetchNotes(scope, 'updated_desc', page)
      for (const n of notes) seen.set(n.id, n)
      if (!hasMore) break
    }
  }
  return [...seen.values()]
}

function localBytes(): number {
  try {
    let total = 0
    for (const key of ['quicknote:prefs:v1', 'quicknote:draft']) {
      total += (localStorage.getItem(key) ?? '').length
    }
    return total * 2 // UTF-16 storage
  } catch {
    return 0
  }
}

export function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const sectionParam = params.get('section') as SectionId | null
  const section: SectionId =
    sectionParam && SECTION_LIST.some((s) => s.id === sectionParam) ? sectionParam : 'appearance'

  const { prefs, update, resetAll } = usePrefs()
  const { profile, user, session, signOut } = useAuth()
  const { folders } = useFolders()
  const { bump } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState<string | null>(null)
  const [confirmDeleteCache, setConfirmDeleteCache] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const {
    isChecking,
    updateAvailable,
    isUpdating,
    lastChecked,
    appVersion,
    checkForUpdates,
    applyUpdate,
  } = usePWAUpdate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    const onPointerDown = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [mobileMenuOpen])

  const handleManualCheck = async () => {
    if (updateAvailable) {
      toast.success('Applying update and reloading…')
      applyUpdate()
      return
    }
    const res = await checkForUpdates(true)
    if (res === 'updated') {
      toast.success('Update found! Applying changes and reloading…')
    } else if (res === 'up-to-date') {
      toast.success(`QuickNote is up to date (Version ${appVersion}).`)
    } else {
      toast.error('Could not check for updates. Check your connection and try again.')
    }
  }

  const bytes = useMemo(() => localBytes(), [])
  const email = user?.email ?? session?.user.email ?? ''
  const verified = Boolean(session?.user.email_confirmed_at)

  const setSection = (id: SectionId) => {
    const next = new URLSearchParams(params)
    next.set('section', id)
    setParams(next, { replace: true })
    setMobileMenuOpen(false)
  }

  const activeSectionItem = SECTION_LIST.find((s) => s.id === section) ?? SECTION_LIST[0]
  const ActiveSectionIcon = activeSectionItem.icon

  /* ------------------------- data actions ------------------------- */

  const runExport = async (kind: 'md' | 'txt' | 'json') => {
    setBusy(`export-${kind}`)
    try {
      const notes = await loadAllNotes()
      if (notes.length === 0) {
        toast.info('Nothing to export yet — create a note first.')
        return
      }
      if (kind === 'md') exportNotesMarkdown(notes)
      if (kind === 'txt') exportNotesText(notes)
      if (kind === 'json') exportNotesJson(notes, folders, [], profile?.full_name ?? '')
      toast.success(`Exported ${notes.length} note${notes.length === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setBusy(null)
    }
  }

  const runImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy('import')
    try {
      const parsed = await parseImportFiles(Array.from(files))
      let count = 0
      for (const item of parsed) {
        await createNote(
          {
            title: item.title.slice(0, 120),
            content: item.content,
            folder_id: prefs.defaultFolderId,
          },
          [],
        )
        count++
      }
      bump()
      toast.success(`Imported ${count} note${count === 1 ? '' : 's'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const doDeleteAccount = async () => {
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteAccount()
      clearPreferences()
      toast.success('Your account and all data were deleted')
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(friendlyError(err))
    } finally {
      setDeleteBusy(false)
    }
  }

  const signOutNow = async () => {
    await signOut()
    navigate('/signin', { replace: true })
  }

  /* ---------------------------- render ---------------------------- */

  return (
    <>
      <PageHeader title="Settings" description="Personalize QuickNote and manage your data." />

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
        {/* Mobile-friendly collapsible section menu (< lg) */}
        <div ref={mobileMenuRef} className="relative w-full min-w-0 lg:hidden">
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="settings-mobile-menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-left shadow-soft transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-white/10 dark:bg-surface-dark dark:hover:bg-white/5"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
                <ActiveSectionIcon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Settings section
                </span>
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {activeSectionItem.label}
                </span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              <span>Menu</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-150 ${mobileMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </span>
          </button>

          {mobileMenuOpen && (
            <nav
              id="settings-mobile-menu"
              aria-label="Settings sections"
              className="mt-2 rounded-xl border border-zinc-200/90 bg-white p-1.5 shadow-raised animate-scale-in dark:border-white/10 dark:bg-surface-dark"
            >
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {SECTION_LIST.map(({ id, label, icon: Icon }) => {
                  const active = section === id
                  return (
                    <li key={id} className="min-w-0">
                      <button
                        type="button"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setSection(id)}
                        className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                          active
                            ? 'bg-brand-600 text-white shadow-soft'
                            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-zinc-100'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="truncate">{label}</span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
        </div>

        {/* Desktop sidebar navigation (>= lg) */}
        <nav
          aria-label="Settings sections"
          className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
        >
          <ul className="flex flex-col gap-1">
            {SECTION_LIST.map(({ id, label, icon: Icon }) => {
              const active = section === id
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setSection(id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                      active
                        ? 'bg-brand-600 text-white shadow-soft'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Section content */}
        <div className="min-w-0 w-full space-y-5 sm:space-y-6">
          {section === 'appearance' && (
            <>
              <Card title="Theme" description="Choose how QuickNote looks. Your choice is remembered on this device.">
                <SegmentedControl
                  ariaLabel="Color theme"
                  value={prefs.theme}
                  onChange={(v) => update({ theme: v })}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ]}
                />
              </Card>
              <Card title="Text size" description="Adjust the base font size across the whole app.">
                <SegmentedControl
                  ariaLabel="Font size"
                  value={prefs.fontScale}
                  onChange={(v) => update({ fontScale: v })}
                  options={[
                    { value: 'sm', label: 'Small' },
                    { value: 'md', label: 'Default' },
                    { value: 'lg', label: 'Large' },
                  ]}
                />
              </Card>
              <Card title="Note list density" description="Compact shows more notes on screen; comfortable adds breathing room.">
                <SegmentedControl
                  ariaLabel="List density"
                  value={prefs.density}
                  onChange={(v) => update({ density: v })}
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ]}
                />
              </Card>
            </>
          )}

          {section === 'account' && (
            <>
              <Card title="Your profile" description="Name, avatar initials, password and verification status.">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white"
                  >
                    {initials(profile?.full_name ?? email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {profile?.full_name ?? 'Unnamed account'}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{email}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/app/profile"
                    className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
                  >
                    Edit profile & password
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => void signOutNow()}>
                    <LogOut className="h-4 w-4" aria-hidden /> Sign out
                  </Button>
                </div>
              </Card>

              <Card title="Verification" description="A verified email keeps your account recoverable.">
                <Badge tone={verified ? 'success' : 'warning'}>
                  {verified ? 'Email verified' : 'Email not verified yet'}
                </Badge>
              </Card>
            </>
          )}

          {section === 'notes' && (
            <>
              <Card title="Defaults for new notes" description="These apply when you create a note.">
                <div className="space-y-4">
                  <Field label="Default folder" htmlFor="set-folder" hint="New notes start here. Leave as Uncategorized to keep them folder-free.">
                    <Select
                      id="set-folder"
                      value={prefs.defaultFolderId ?? ''}
                      onChange={(e) => update({ defaultFolderId: e.target.value || null })}
                    >
                      <option value="">Uncategorized</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Default sorting" htmlFor="set-sort">
                    <Select
                      id="set-sort"
                      value={prefs.defaultSort}
                      onChange={(e) => update({ defaultSort: e.target.value as SortKey })}
                    >
                      <option value="updated_desc">Recently updated</option>
                      <option value="created_desc">Recently created</option>
                      <option value="created_asc">Oldest first</option>
                      <option value="title_asc">Title A–Z</option>
                      <option value="title_desc">Title Z–A</option>
                    </Select>
                  </Field>
                  <Field label="Default list view" htmlFor="set-view">
                    <Select
                      id="set-view"
                      value={prefs.defaultView}
                      onChange={(e) => update({ defaultView: e.target.value as ViewMode })}
                    >
                      <option value="grid">Grid of cards</option>
                      <option value="list">Compact list</option>
                    </Select>
                  </Field>
                </div>
              </Card>

              <Card title="Editor behavior" description="Control how the note editor saves and what happens after you save.">
                <div className="divide-y divide-zinc-100 dark:divide-white/10">
                  <Switch
                    checked={prefs.autosave}
                    onChange={(v) => update({ autosave: v })}
                    label="Autosave"
                    description="Save automatically ~1 second after you stop typing. A manual Save button is always available."
                  />
                  <Switch
                    checked={prefs.stayAfterSave}
                    onChange={(v) => update({ stayAfterSave: v })}
                    label="Stay in the editor after saving"
                    description="Turn off to return to All Notes whenever you press Save."
                  />
                </div>
              </Card>
            </>
          )}

          {section === 'privacy' && (
            <>
              <Card
                title="How your data is protected"
                description="Authentication is handled by Supabase Auth. Row Level Security on every table restricts reads and writes to your user ID — other users and unauthenticated visitors cannot access your notes. Traffic is encrypted in transit (HTTPS)."
              >
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> Notes are stored in your private Supabase database — not in this browser.</li>
                  <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> This build does <strong>not</strong> use end-to-end encryption; note contents are readable by the database service that stores them.</li>
                  <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Local device storage holds only UI preferences and temporary unsaved drafts.</li>
                </ul>
              </Card>

              <Card title="Session" description="Information about your current session, when available.">
                <dl className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">Signed in as</dt>
                    <dd className="min-w-0 max-w-full truncate font-medium text-zinc-800 dark:text-zinc-200">{email || '—'}</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">Email status</dt>
                    <dd>{verified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>}</dd>
                  </div>
                  {session?.user.last_sign_in_at && (
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <dt className="text-zinc-500 dark:text-zinc-400">Last sign-in</dt>
                      <dd className="text-right text-zinc-700 dark:text-zinc-300">
                        {new Date(session.user.last_sign_in_at).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Sessions are stored by Supabase Auth and restored when you refresh the browser.
                  Signing out clears all local session state on this device.
                </p>
              </Card>

              <Card title="Offline & synchronization">
                <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  QuickNote needs a connection to load and save notes. If you go offline, unsaved
                  edits are kept as a local draft on this device and offered back to you when you
                  return. Full offline editing with background synchronization is planned for a
                  later release.
                </p>
              </Card>

              <div className="rounded-xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900/60 dark:bg-red-950/30">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  <Trash2 className="h-4 w-4" aria-hidden /> Delete account
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-red-600/90 dark:text-red-300/90">
                  Permanently removes your profile, notes, folders, tags and account. This cannot be
                  undone. Export your data first if you want a copy.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void runExport('json')}>
                    <Download className="h-4 w-4" aria-hidden /> Export backup first
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setDeletePhrase(''); setDeleteError(null); setDeleteOpen(true) }}>
                    Delete my account
                  </Button>
                </div>
              </div>
            </>
          )}

          {section === 'notifications' && (
            <Card
              title="What QuickNote sends"
              description="Only supported notifications exist here — there are no switches for things the app doesn't actually do."
            >
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
                <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-100 p-3 sm:flex-nowrap dark:border-white/10">
                  <span className="min-w-0 flex-1">
                    <strong className="block font-medium text-zinc-900 dark:text-zinc-100">Action toasts</strong>
                    In-app confirmations for saves, deletes, exports and errors. Always shown.
                  </span>
                  <Badge tone="success" className="shrink-0">On</Badge>
                </li>
                <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-100 p-3 sm:flex-nowrap dark:border-white/10">
                  <span className="min-w-0 flex-1">
                    <strong className="block font-medium text-zinc-900 dark:text-zinc-100">Security emails</strong>
                    Email verification and password reset messages. Required for account safety.
                  </span>
                  <Badge tone="success" className="shrink-0">Always on</Badge>
                </li>
                <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-100 p-3 sm:flex-nowrap dark:border-white/10">
                  <span className="min-w-0 flex-1">
                    <strong className="block font-medium text-zinc-900 dark:text-zinc-100">Browser push notifications</strong>
                    Not used — QuickNote never prompts for notification permission.
                  </span>
                  <Badge className="shrink-0">Off</Badge>
                </li>
                <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-100 p-3 sm:flex-nowrap dark:border-white/10">
                  <span className="min-w-0 flex-1">
                    <strong className="block font-medium text-zinc-900 dark:text-zinc-100">Product announcements</strong>
                    None are sent in this version.
                  </span>
                  <Badge className="shrink-0">None</Badge>
                </li>
              </ul>
            </Card>
          )}

          {section === 'accessibility' && (
            <>
              <Card title="Motion" description="QuickNote respects your system reduced-motion setting automatically.">
                <Switch
                  checked={prefs.reduceMotion}
                  onChange={(v) => update({ reduceMotion: v })}
                  label="Reduce animations"
                  description="Minimize transitions and animations across the interface."
                />
              </Card>
              <Card title="Built-in support" description="No configuration needed — these are always available.">
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <li className="flex gap-2"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Full keyboard navigation with a visible focus ring on every control.</li>
                  <li className="flex gap-2"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> “Skip to content” link on application pages, semantic headings and labelled form fields.</li>
                  <li className="flex gap-2"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Dialogs trap focus, close with Escape and return focus to the trigger.</li>
                  <li className="flex gap-2"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Status updates (saving, errors, counts) are announced to screen readers.</li>
                  <li className="flex gap-2"><Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden /> Text size and contrast work with browser zoom up to 200%+.</li>
                </ul>
                <p className="mt-4 text-xs text-zinc-400">
                  Font size is adjustable under <button type="button" onClick={() => setSection('appearance')} className="font-medium text-brand-600 underline-offset-2 hover:underline">Appearance</button>.
                </p>
              </Card>
            </>
          )}

          {section === 'data' && (
            <>
              <Card title="Export" description="Download everything you own. Exports include only your notes.">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void runExport('md')} loading={busy === 'export-md'}>
                    <Download className="h-4 w-4" aria-hidden /> Markdown (.md)
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void runExport('txt')} loading={busy === 'export-txt'}>
                    <Download className="h-4 w-4" aria-hidden /> Plain text (.txt)
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => void runExport('json')} loading={busy === 'export-json'}>
                    <Download className="h-4 w-4" aria-hidden /> JSON backup
                  </Button>
                </div>
              </Card>

              <Card
                title="Import"
                description="Bring in .md or .txt files (up to 512 KB each). The first line or heading becomes the note title. Imported notes land in your default folder."
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  multiple
                  className="sr-only"
                  onChange={(e) => void runImport(e.target.files)}
                  aria-label="Choose note files to import"
                />
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={busy === 'import'}>
                  <Upload className="h-4 w-4" aria-hidden /> Choose files
                </Button>
              </Card>

              <Card title="Storage on this device" description="Notes themselves live in the cloud — only preferences and drafts stay here.">
                <dl className="space-y-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">Local preferences & draft</dt>
                    <dd className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{formatBytes(bytes)}</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <dt className="text-zinc-500 dark:text-zinc-400">Note storage</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200">Supabase (cloud)</dd>
                  </div>
                </dl>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setConfirmDeleteCache(true)}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reset local preferences & drafts
                </Button>
              </Card>
            </>
          )}

          {section === 'about' && (
            <>
              <Card title="QuickNote" description="Capture your thoughts. Keep everything organized.">
                <dl className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">App installation</dt>
                    <dd>
                      <PWAInstallButton variant="settings" />
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">App version</dt>
                    <dd className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {appVersion} (PWA)
                      </span>
                      {updateAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          <Sparkles className="h-3 w-3" /> Update ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Up to date
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <dt className="text-zinc-500 dark:text-zinc-400">Replay onboarding</dt>
                    <dd>
                      <Link
                        to="/introduction"
                        className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                      >
                        View the tutorial again
                      </Link>
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card
                title="Check for updates"
                description="Keep your phone and desktop app in sync with the latest features. Tapping Check for updates checks for new changes and applies them automatically."
              >
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {isUpdating
                          ? 'Applying new update…'
                          : updateAvailable
                          ? 'New version available!'
                          : isChecking
                          ? 'Checking for updates…'
                          : 'QuickNote is up to date'}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {isUpdating
                          ? 'Installing latest changes and refreshing the app…'
                          : updateAvailable
                          ? 'A new update is ready. Tap to apply and reload immediately.'
                          : lastChecked
                          ? `Last checked ${relativeTime(lastChecked.toISOString())}`
                          : 'Checks server for the latest app changes.'}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {updateAvailable ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={applyUpdate}
                          loading={isUpdating}
                        >
                          <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                          {isUpdating ? 'Applying…' : 'Apply update now'}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleManualCheck()}
                          loading={isChecking || isUpdating}
                        >
                          <RefreshCw className={`h-4 w-4 ${isChecking || isUpdating ? 'animate-spin' : ''}`} />
                          {isUpdating ? 'Applying…' : isChecking ? 'Checking…' : 'Check for updates'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Get help">
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/app/help"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
                  >
                    <HelpCircle className="h-4 w-4" aria-hidden /> Help center
                  </Link>
                  <Link
                    to="/app/feedback"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden /> Send feedback
                  </Link>
                  <Link
                    to="/privacy"
                    className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to="/terms"
                    className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200"
                  >
                    Terms of Service
                  </Link>
                </div>
                {supportEmail && (
                  <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                    Contact support:{' '}
                    <a href={`mailto:${supportEmail}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                      {supportEmail}
                    </a>
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Reset local data confirmation */}
      <ConfirmDialog
        open={confirmDeleteCache}
        title="Reset local preferences?"
        message="Theme, sort defaults and any unsaved draft on this device will be cleared. Your notes in the cloud are not affected."
        confirmLabel="Reset local data"
        danger
        onConfirm={async () => {
          resetAll()
          setConfirmDeleteCache(false)
          toast.success('Local preferences and drafts cleared')
        }}
        onClose={() => setConfirmDeleteCache(false)}
      />

      {/* Account deletion — explicit, typed confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleteBusy) setDeleteOpen(false)
        }}
        title="Delete your account permanently?"
        description="This erases your profile, every note, folder and tag — immediately and irreversibly."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteBusy}
              disabled={deletePhrase !== 'DELETE'}
              onClick={() => void doDeleteAccount()}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {deleteError}
            </p>
          )}
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Consider exporting a backup first — deleted data cannot be recovered.
          </p>
          <Field label={<>Type <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-white/10">DELETE</code> to confirm</>} htmlFor="confirm-phrase">
            <Input
              id="confirm-phrase"
              value={deletePhrase}
              autoComplete="off"
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="DELETE"
            />
          </Field>
        </div>
      </Modal>
    </>
  )
}
