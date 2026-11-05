import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, Field, Input } from '@/components/ui'
import { fieldErrors, signInSchema, type FieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/supabase'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'

export function SignIn() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { signIn, isAuthenticated, initializing } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const next = params.get('next') ?? '/app'
  const notice = params.get('notice')

  if (!initializing && isAuthenticated) return <Navigate to={next} replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = signInSchema.safeParse({ email, password, remember })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setSubmitting(true)
    try {
      await signIn({ email: parsed.data.email, password: parsed.data.password })
      toast.success('Welcome back!')
      navigate(next, { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to reach your notes, folders and tags."
      footer={
        <>
          New to QuickNote?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Create an account
          </Link>
        </>
      }
    >
      {notice === 'verified' && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-300"
        >
          Your email is verified — sign in to continue.
        </div>
      )}
      {notice === 'reset' && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-800 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300"
        >
          Your password was updated — sign in with your new password.
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
          >
            {serverError}
          </div>
        )}

        <Field label="Email address" htmlFor="si-email" required error={errors.email}>
          <Input
            id="si-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrors((er) => ({ ...er, email: undefined }))
            }}
          />
        </Field>

        <Field label="Password" htmlFor="si-password" required error={errors.password}>
          <div className="relative">
            <Input
              id="si-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
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
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 my-auto flex h-9 w-10 items-center justify-center rounded-md text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-[#4f46e5]"
            />
            Keep me signed in
          </label>
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Sign In
        </Button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Protected by Supabase Auth. Sessions are restored when you refresh.
        </p>
      </form>
    </AuthLayout>
  )
}
