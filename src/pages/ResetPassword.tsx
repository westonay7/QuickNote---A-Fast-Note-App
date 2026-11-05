import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, CenterSpinner, Field, Input } from '@/components/ui'
import { fieldErrors, resetPasswordSchema, type FieldErrors } from '@/lib/validation'
import { friendlyError, getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { clearDraft } from '@/lib/prefs'
import { useToast } from '@/state/ToastContext'

/**
 * Password recovery step 2: requires a valid password-recovery session
 * created by the emailed link, then saves a new password securely.
 */
export function ResetPassword() {
  const navigate = useNavigate()
  const toast = useToast()
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Wait for the recovery session (tokens may arrive via redirect processing)
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const sb = getSupabase()
    let cancelled = false

    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setReady(true)
    })

    const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
      if (cancelled) return
      setSession(next)
      setReady(true)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setSubmitting(true)
    try {
      const { error } = await getSupabase().auth.updateUser({ password: parsed.data.password })
      if (error) throw new Error(friendlyError(error))
      clearDraft()
      toast.success('Password updated — sign in with your new password')
      navigate('/signin?notice=reset', { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not update the password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <>
          Changed your mind?{' '}
          <Link to="/signin" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Back to Sign In
          </Link>
        </>
      }
    >
      {!ready ? (
        <CenterSpinner label="Checking your reset link" />
      ) : !session ? (
        <div className="card p-6 text-center animate-slide-up">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            This reset link is invalid, expired, or was already used. Request a new one to continue.
          </p>
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
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {serverError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {serverError}
            </div>
          )}

          <Field label="New password" htmlFor="rp-password" required error={errors.password}>
            <div className="relative">
              <Input
                id="rp-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                placeholder="Enter a new password"
                value={password}
                invalid={Boolean(errors.password)}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrors((er) => ({ ...er, password: undefined }))
                }}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
                aria-pressed={show}
                className="absolute inset-y-0 right-0 my-auto flex h-9 w-10 items-center justify-center rounded-md text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" htmlFor="rp-confirm" required error={errors.confirmPassword}>
            <Input
              id="rp-confirm"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat the new password"
              value={confirmPassword}
              invalid={Boolean(errors.confirmPassword)}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setErrors((er) => ({ ...er, confirmPassword: undefined }))
              }}
            />
          </Field>

          <p className="text-xs text-zinc-400">
            Use at least 8 characters with a letter and a number. You'll sign in with the new
            password right after.
          </p>

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Save new password
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
