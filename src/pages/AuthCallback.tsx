import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, CenterSpinner } from '@/components/ui'
import { friendlyError, getSupabase } from '@/lib/supabase'

type Status = 'working' | 'ok' | 'error'

/**
 * Handles verification / recovery redirects from Supabase Auth emails.
 * Supports PKCE (`?code=`), token-hash links (`?token_hash=`) and the
 * implicit hash flow (processed automatically by detectSessionInUrl).
 */
export function AuthCallback() {
  const [status, setStatus] = useState<Status>('working')
  const [message, setMessage] = useState('')
  const startedRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      const sb = getSupabase()
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')

      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code)
          if (error) throw new Error(friendlyError(error))
        } else if (tokenHash) {
          const { error } = await sb.auth.verifyOtp({
            token_hash: tokenHash,
            type: (type as 'signup' | 'recovery' | 'email_change') ?? 'signup',
          })
          if (error) throw new Error(friendlyError(error))
        }

        // detectSessionInUrl may still be processing hash tokens — give it a beat
        for (let i = 0; i < 20; i++) {
          const { data } = await sb.auth.getSession()
          if (data.session) {
            setStatus('ok')
            return
          }
          await new Promise((r) => setTimeout(r, 150))
        }
        setStatus('error')
        setMessage('This link has expired or was already used. Request a fresh one below.')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not verify this link.')
      }
    }

    void run()
  }, [])

  return (
    <AuthLayout
      title={status === 'ok' ? 'All set!' : status === 'error' ? 'Link problem' : 'Verifying your link…'}
      subtitle={
        status === 'ok'
          ? 'Your email has been verified.'
          : status === 'error'
            ? 'We could not complete that request.'
            : 'This only takes a moment.'
      }
    >
      <div className="card p-6 text-center">
        {status === 'working' && <CenterSpinner label="Verifying your link" />}

        {status === 'ok' && (
          <div className="animate-slide-up">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              You're verified and signed in. Welcome to QuickNote!
            </p>
            <Button className="mt-5 w-full" onClick={() => navigate('/app', { replace: true })}>
              Continue to QuickNote
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-slide-up">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{message}</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                to="/forgot-password"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Request a new link
              </Link>
              <Link
                to="/signin"
                className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
