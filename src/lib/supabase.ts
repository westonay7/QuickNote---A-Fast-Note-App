import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const defaultUrl = 'https://xgfthqjrnqmsgcizddpq.supabase.co'
const defaultAnonKey = 'sb_publishable_J33jjhr_dbK69BnN5kx1hA_6hl3UJ64'

const url =
  rawUrl && !rawUrl.includes('your-project-ref') ? rawUrl : defaultUrl
const anonKey =
  rawAnonKey && !rawAnonKey.includes('your-anon') ? rawAnonKey : defaultAnonKey

/**
 * True only when real, non-placeholder credentials are present.
 * The anon key is safe to expose in the browser — it is designed for client use
 * and is protected by Row Level Security. The service-role key must NEVER be
 * shipped to the client, and this app never references it.
 */
export const isSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    /^https?:\/\//.test(url) &&
    !url.includes('your-project-ref') &&
    !anonKey.includes('your-anon'),
)

export const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined

let client: SupabaseClient | null = null

/** Returns the shared Supabase client, or throws when the project is not configured. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!isSupabaseConfigured || !url || !anonKey) {
      throw new Error(
        'QuickNote is not connected to Supabase yet. Copy .env.example to .env and add your project URL and anon key.',
      )
    }
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'quicknote-auth',
      },
    })
  }
  return client
}

/**
 * Turns Supabase/Postgrest error codes into messages that are safe to show
 * users. Never leaks SQL details, RLS internals, or secrets.
 */
export function friendlyError(error: unknown): string {
  const err = error as { code?: string; message?: string; status?: number } | null
  const code = err?.code ?? ''
  const message = err?.message ?? ''
  const text = `${code} ${message}`.toLowerCase()

  if (!isSupabaseConfigured) return 'QuickNote is not connected to Supabase yet. Check your .env file.'
  if (text.includes('failed to fetch') || text.includes('networkerror') || text.includes('fetch failed'))
    return 'Network unavailable. Check your connection and try again.'
  if (text.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (text.includes('email not confirmed')) return 'Please verify your email address first.'
  if (text.includes('user already registered') || text.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.'
  if (text.includes('password should be at least')) return 'Password must be at least 8 characters.'
  if (text.includes('unable to validate email') || text.includes('invalid email'))
    return 'Please enter a valid email address.'
  if (text.includes('rate limit') || text.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (code === '23505' || text.includes('duplicate key')) return 'That name is already in use.'
  if (code === '42501' || text.includes('row-level security') || text.includes('violates row-level'))
    return 'You do not have permission to do that.'
  if (code === 'PGRST116' || text.includes('jwt') || text.includes('session'))
    return 'Your session has expired. Please sign in again.'
  if (code === '23503' || text.includes('foreign key')) return 'That item no longer exists.'
  if (text.includes('signup is disabled')) return 'Registration is currently disabled on this project.'
  if (text.includes('smtp') || text.includes('error sending'))
    return 'The email could not be sent. Please try again later or contact support.'
  if (message) return 'Something went wrong. Please try again.'
  return 'Something went wrong. Please try again.'
}
