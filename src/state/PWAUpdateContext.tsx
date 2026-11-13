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

export const APP_VERSION = '1.2.0'

/**
 * Extracts hashed production bundle asset paths (/assets/...) from a Document
 * so we can detect newly deployed builds even if a service worker previously
 * activated silently in the background or HTTP caches delayed sw.js checks.
 */
function getBuildAssetSignature(doc: Document): string {
  const urls: string[] = []
  doc.querySelectorAll('script[src], link[rel="stylesheet"][href]').forEach((el) => {
    const raw = el.getAttribute('src') ?? el.getAttribute('href') ?? ''
    if (raw.includes('/assets/')) {
      urls.push(raw)
    }
  })
  return urls.sort().join('|')
}

async function fetchRemoteBuildMismatch(initialSignature: string): Promise<boolean> {
  if (!initialSignature || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return false
  }
  try {
    const base = import.meta.env.BASE_URL || '/'
    const url = `${base.endsWith('/') ? base : `${base}/`}index.html?_sw_check=${Date.now()}`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })
    if (!res.ok) return false
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return false
    const html = await res.text()
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    const remoteSignature = getBuildAssetSignature(parsed)
    return Boolean(remoteSignature && remoteSignature !== initialSignature)
  } catch {
    return false
  }
}

async function waitForInstallingWorker(
  reg: ServiceWorkerRegistration,
  idleWaitMs: number,
  installTimeoutMs: number,
): Promise<{ found: boolean; activated: boolean }> {
  if (reg.waiting) {
    return { found: true, activated: false }
  }

  return new Promise((resolve) => {
    let settled = false
    let installTimer: number | null = null
    let idleTimer: number | null = null

    const finish = (result: { found: boolean; activated: boolean }) => {
      if (settled) return
      settled = true
      if (installTimer !== null) window.clearTimeout(installTimer)
      if (idleTimer !== null) window.clearTimeout(idleTimer)
      reg.removeEventListener('updatefound', onUpdateFound)
      resolve(result)
    }

    const watchWorker = (worker: ServiceWorker) => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer)
        idleTimer = null
      }
      installTimer = window.setTimeout(() => {
        finish({ found: true, activated: worker.state === 'activated' })
      }, installTimeoutMs)

      const onStateChange = () => {
        if (worker.state === 'installed') {
          worker.removeEventListener('statechange', onStateChange)
          finish({ found: true, activated: false })
        } else if (worker.state === 'activated') {
          worker.removeEventListener('statechange', onStateChange)
          finish({ found: true, activated: true })
        } else if (worker.state === 'redundant') {
          worker.removeEventListener('statechange', onStateChange)
          finish({ found: Boolean(reg.waiting), activated: false })
        }
      }

      if (worker.state === 'installed' || worker.state === 'activated') {
        onStateChange()
      } else {
        worker.addEventListener('statechange', onStateChange)
      }
    }

    const onUpdateFound = () => {
      if (reg.installing) {
        watchWorker(reg.installing)
      } else if (reg.waiting) {
        finish({ found: true, activated: false })
      }
    }

    if (reg.installing) {
      watchWorker(reg.installing)
      return
    }

    reg.addEventListener('updatefound', onUpdateFound, { once: true })
    idleTimer = window.setTimeout(() => {
      finish({ found: Boolean(reg.waiting || reg.installing), activated: false })
    }, idleWaitMs)
  })
}

export function PWAUpdateProvider({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)
  const isExplicitUpdateRef = useRef(false)
  const isUpdatingRef = useRef(false)
  const reloadingRef = useRef(false)
  const controllerChangedInBackgroundRef = useRef(false)
  const initialAssetSignatureRef = useRef('')
  const lastCheckedRef = useRef<Date | null>(null)

  const reloadNow = useCallback(() => {
    if (reloadingRef.current) return
    reloadingRef.current = true
    window.location.reload()
  }, [])

  // Capture initial production asset signature & clear any legacy cache
  useEffect(() => {
    if (typeof document !== 'undefined') {
      initialAssetSignatureRef.current = getBuildAssetSignature(document)
    }
    if (typeof caches !== 'undefined') {
      void caches.delete('quicknote-v1').catch(() => undefined)
    }
  }, [])

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
            if (reg.waiting) {
              setUpdateAvailable(true)
            }
            // Initial background check after registration is active
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

    // ONLY reload immediately when the user explicitly triggers an update.
    // Never interrupt active note editing by silently reloading in the background;
    // instead mark updateAvailable so tapping "Check for updates" or "Update Now" reloads right away.
    const onControllerChange = () => {
      if (isExplicitUpdateRef.current) {
        reloadNow()
      } else {
        controllerChangedInBackgroundRef.current = true
        setUpdateAvailable(true)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [reloadNow])

  // Apply update and reload into the latest build
  const applyUpdate = useCallback(() => {
    if (isUpdatingRef.current) return
    isUpdatingRef.current = true
    isExplicitUpdateRef.current = true
    setIsUpdating(true)

    const runApply = async () => {
      try {
        if (typeof caches !== 'undefined') {
          await caches.delete('quicknote-v1').catch(() => undefined)
        }

        let reg = registrationRef.current
        if (!reg && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          reg = (await navigator.serviceWorker.getRegistration().catch(() => undefined)) ?? null
          if (reg) registrationRef.current = reg
        }

        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        if (updateSWRef.current && reg?.waiting) {
          await updateSWRef.current(true).catch(() => undefined)
        }
      } finally {
        // Guaranteed reload fallback in case controllerchange already fired or is skipped
        window.setTimeout(() => {
          reloadNow()
        }, 1200)
      }
    }

    void runApply()
  }, [reloadNow])

  // Manual or automatic update check
  const checkForUpdates = useCallback(
    async (manual = false): Promise<'updated' | 'up-to-date' | 'error'> => {
      setIsChecking(true)

      try {
        const now = new Date()

        // If an update is already waiting or activated in the background, apply immediately on manual check
        let reg = registrationRef.current
        if (!reg && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          reg = (await navigator.serviceWorker.getRegistration().catch(() => undefined)) ?? null
          if (reg) registrationRef.current = reg
        }

        if (reg?.waiting || controllerChangedInBackgroundRef.current) {
          setUpdateAvailable(true)
          lastCheckedRef.current = now
          setLastChecked(now)
          setIsChecking(false)
          if (manual) {
            applyUpdate()
          }
          return 'updated'
        }

        let swUpdateDetected = false

        if (reg) {
          const waitPromise = waitForInstallingWorker(
            reg,
            manual ? 450 : 250,
            manual ? 12000 : 4000,
          )
          await reg.update()
          const result = await waitPromise
          if (result.activated) {
            controllerChangedInBackgroundRef.current = true
          }
          if (result.found || Boolean(reg.waiting)) {
            swUpdateDetected = true
          }
        }

        // Cross-check live index.html bundle hashes on manual check (or if SW didn't report one)
        const remoteMismatch = swUpdateDetected
          ? false
          : await fetchRemoteBuildMismatch(initialAssetSignatureRef.current)

        const checkedAt = new Date()
        lastCheckedRef.current = checkedAt
        setLastChecked(checkedAt)
        setIsChecking(false)

        if (swUpdateDetected || remoteMismatch || controllerChangedInBackgroundRef.current) {
          setUpdateAvailable(true)
          if (manual) {
            applyUpdate()
          }
          return 'updated'
        }

        return 'up-to-date'
      } catch (err) {
        console.warn('Update check failed:', err)
        setIsChecking(false)
        return 'error'
      }
    },
    [applyUpdate],
  )

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
