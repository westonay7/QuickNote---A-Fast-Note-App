import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { registerSW } from 'virtual:pwa-register'

export interface PWAUpdateContextValue {
  isChecking: boolean
  updateAvailable: boolean
  isUpdating: boolean
  offlineReady: boolean
  lastChecked: Date | null
  appVersion: string
  checkForUpdates: (manual?: boolean) => Promise<'updated' | 'up-to-date' | 'error'>
  applyUpdate: () => void
}

const PWAUpdateContext = createContext<PWAUpdateContextValue | null>(null)

export const APP_VERSION = '1.1.0'

export function PWAUpdateProvider({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  const isExplicitUpdateRef = useRef(false)
  const lastCheckedRef = useRef<Date | null>(null)

  // Initialize Service Worker with virtual:pwa-register
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          setUpdateAvailable(true)
        },
        onOfflineReady() {
          setOfflineReady(true)
        },
        onRegistered(reg) {
          if (reg) {
            registrationRef.current = reg
            // Initial check after registration is active
            void reg.update().catch(() => undefined)
          }
        },
        onRegisterError(err: unknown) {
          console.warn('Service Worker registration note:', err)
        },
      })

      updateSWRef.current = updateSW
    } catch {
      // Fallback in case virtual:pwa-register is unavailable
    }

    // ONLY reload when the user explicitly triggers an update!
    // Never interrupt active app usage by silently reloading in the background.
    const onControllerChange = () => {
      if (isExplicitUpdateRef.current) {
        window.location.reload()
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  // Manual or automatic update check
  const checkForUpdates = useCallback(
    async (_manual = false): Promise<'updated' | 'up-to-date' | 'error'> => {
      setIsChecking(true)

      try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
          setLastChecked(new Date())
          setIsChecking(false)
          return 'up-to-date'
        }

        let reg = registrationRef.current
        if (!reg) {
          const registered = await navigator.serviceWorker.getRegistration()
          reg = registered ?? null
          if (reg) registrationRef.current = reg
        }

        if (!reg) {
          setLastChecked(new Date())
          setIsChecking(false)
          return 'up-to-date'
        }

        // If a worker is already waiting, an update is ready
        if (reg.waiting) {
          setUpdateAvailable(true)
          setLastChecked(new Date())
          setIsChecking(false)
          return 'updated'
        }

        let updateFound = false
        const handleUpdateFound = () => {
          updateFound = true
          const installing = reg?.installing
          if (installing) {
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true)
              }
            })
          }
        }

        reg.addEventListener('updatefound', handleUpdateFound, { once: true })

        // Check the server for changes to sw.js and precache assets
        await reg.update()

        // Allow a brief moment for updatefound or waiting state to settle
        await new Promise((resolve) => setTimeout(resolve, 800))
        reg.removeEventListener('updatefound', handleUpdateFound)

        const now = new Date()
        lastCheckedRef.current = now
        setLastChecked(now)
        setIsChecking(false)

        if (updateFound || reg.waiting || reg.installing) {
          setUpdateAvailable(true)
          return 'updated'
        }

        return 'up-to-date'
      } catch (err) {
        console.warn('Update check failed:', err)
        setIsChecking(false)
        return 'error'
      }
    },
    [],
  )

  // Apply update and reload
  const applyUpdate = useCallback(() => {
    isExplicitUpdateRef.current = true
    setIsUpdating(true)
    const reg = registrationRef.current
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    if (updateSWRef.current) {
      void updateSWRef.current(true)
    } else {
      window.location.reload()
    }
  }, [])

  // Auto-check for updates gently without interrupting active usage
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        // Only check if at least 15 minutes have passed since last check
        if (!lastCheckedRef.current || now - lastCheckedRef.current.getTime() > 15 * 60 * 1000) {
          void checkForUpdates(false)
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    // Check periodically every 15 minutes
    const interval = setInterval(() => {
      void checkForUpdates(false)
    }, 15 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      clearInterval(interval)
    }
  }, [checkForUpdates])

  const value: PWAUpdateContextValue = {
    isChecking,
    updateAvailable,
    isUpdating,
    offlineReady,
    lastChecked,
    appVersion: APP_VERSION,
    checkForUpdates,
    applyUpdate,
  }

  return <PWAUpdateContext.Provider value={value}>{children}</PWAUpdateContext.Provider>
}

export function usePWAUpdate(): PWAUpdateContextValue {
  const ctx = useContext(PWAUpdateContext)
  if (!ctx) {
    throw new Error('usePWAUpdate must be used within a PWAUpdateProvider')
  }
  return ctx
}
