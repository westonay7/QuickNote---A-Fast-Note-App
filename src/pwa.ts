import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the PWA service worker with auto-update.
 * Logs offline readiness and updates cleanly without interfering with user workflows.
 */
export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Register the service worker so PWABuilder and browsers detect an active service worker
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('QuickNote Service Worker active:', reg.scope)
      })
      .catch((err) => {
        console.warn('Service Worker registration note:', err)
      })
  })

  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        void updateSW(true)
      },
      onOfflineReady() {
        console.log('QuickNote is ready for offline use.')
      },
      onRegisterError(error: unknown) {
        console.warn('PWA service worker auto-update note:', error)
      },
    })
  } catch {
    // Fallback if virtual:pwa-register is not available in non-vite contexts
  }
}
