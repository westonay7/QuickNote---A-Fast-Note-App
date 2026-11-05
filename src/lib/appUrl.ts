/**
 * Builds an absolute URL for an in-app path.
 *
 * The app is served from the root in development (`/`), but GitHub Pages
 * project sites live under a subpath such as `/QuickNote-Note-App/`.
 * `import.meta.env.BASE_URL` is Vite's configured base, always ending in `/`,
 * so joining it here keeps auth redirects correct in both cases.
 */
export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const suffix = path.replace(/^\/+/, '')
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${window.location.origin}${prefix}${suffix}`
}
