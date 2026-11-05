import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadPreferences, savePreferences } from '@/lib/prefs'
import { DEFAULT_PREFERENCES, type AppPreferences } from '@/lib/types'

interface PrefsApi {
  prefs: AppPreferences
  update: (patch: Partial<AppPreferences>) => void
  reset: () => void
  /** Full reset — used on sign-out so one user never inherits another's settings. */
  resetAll: () => void
}

const PrefsContext = createContext<PrefsApi | null>(null)

function applyTheme(theme: AppPreferences['theme']) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppPreferences>(() => loadPreferences())

  // Apply + persist whenever preferences change
  useEffect(() => {
    applyTheme(prefs.theme)
    document.documentElement.dataset.fontScale = prefs.fontScale
    document.documentElement.dataset.reduceMotion = String(prefs.reduceMotion)
    savePreferences(prefs)
  }, [prefs])

  // Follow the OS when theme = system
  useEffect(() => {
    if (prefs.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [prefs.theme])

  const update = useCallback((patch: Partial<AppPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      theme: 'system',
      fontScale: 'md',
      density: 'comfortable',
      reduceMotion: false,
      defaultSort: 'updated_desc',
      defaultView: 'grid',
      defaultFolderId: null,
      autosave: true,
      stayAfterSave: false,
    }))
  }, [])

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem('quicknote:prefs:v1')
      localStorage.removeItem('quicknote:draft')
    } catch {
      /* ignore */
    }
    setPrefs({ ...DEFAULT_PREFERENCES })
  }, [])

  const value = useMemo(() => ({ prefs, update, reset, resetAll }), [prefs, update, reset, resetAll])
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider')
  return ctx
}
