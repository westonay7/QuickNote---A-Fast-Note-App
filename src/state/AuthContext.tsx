import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { fetchProfile, updateProfile as apiUpdateProfile } from '@/lib/api'
import { appUrl } from '@/lib/appUrl'
import { isSupabaseConfigured, getSupabase, friendlyError } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { usePrefs } from './PrefsContext'

export type SignUpResult = 'active' | 'verify-email'

interface AuthApi {
  initializing: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  isAuthenticated: boolean
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<SignUpResult>
  signIn: (input: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  saveFullName: (fullName: string) => Promise<void>
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { resetAll } = usePrefs()
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(isSupabaseConfigured)
  const [profile, setProfile] = useState<Profile | null>(null)

  // ---- session lifecycle --------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const sb = getSupabase()

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setInitializing(false)
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id ?? null

  // ---- profile loading ----------------------------------------------------
  const refreshProfile = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return
    try {
      const p = await fetchProfile(userId)
      setProfile(p)
    } catch {
      /* profile is non-critical; screen shows fallback initials */
    }
  }, [userId])

  useEffect(() => {
    if (userId) void refreshProfile()
    else setProfile(null)
  }, [userId, refreshProfile])

  // ---- actions ------------------------------------------------------------
  const signUp = useCallback<AuthApi['signUp']>(async ({ fullName, email, password }) => {
    const sb = getSupabase()
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: appUrl('/auth/callback'),
      },
    })
    if (error) throw new Error(friendlyError(error))
    // No session => confirmation email was sent (email confirmation enabled).
    const needsVerification = Boolean(data.user) && !data.session
    return needsVerification ? 'verify-email' : 'active'
  }, [])

  const signIn = useCallback<AuthApi['signIn']>(async ({ email, password }) => {
    const sb = getSupabase()
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(friendlyError(error))
  }, [])

  const signOut = useCallback(async () => {
    resetAll()
    if (!isSupabaseConfigured) return
    try {
      await getSupabase().auth.signOut()
    } catch {
      /* network hiccup — local state is cleared regardless */
    }
    setSession(null)
    setProfile(null)
  }, [resetAll])

  const saveFullName = useCallback(
    async (fullName: string) => {
      if (!userId) throw new Error('You are signed out.')
      const updated = await apiUpdateProfile(userId, fullName)
      setProfile(updated)
    },
    [userId],
  )

  const value = useMemo<AuthApi>(
    () => ({
      initializing,
      session,
      user: session?.user ?? null,
      profile,
      isAuthenticated: Boolean(session),
      signUp,
      signIn,
      signOut,
      refreshProfile,
      saveFullName,
    }),
    [initializing, session, profile, signUp, signIn, signOut, refreshProfile, saveFullName],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
