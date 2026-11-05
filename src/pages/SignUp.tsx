import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button, Field, Input } from '@/components/ui'
import { fieldErrors, passwordStrength, signUpSchema, type FieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/supabase'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'
import { cn } from '@/lib/format'

export function SignUp() {
  const navigate = useNavigate()
  const { signUp, isAuthenticated, initializing } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const strength = useMemo(() => passwordStrength(form.password), [form.password])
  const set = (key: keyof typeof form) => (value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  if (!initializing && isAuthenticated) return <Navigate to="/app" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = signUpSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setSubmitting(true)
    try {
      const result = await signUp(parsed.data)
      if (result === 'verify-email') {
        toast.success('Account created — check your email to verify it.')
        navigate('/verify-email', { state: { email: parsed.data.email } })
      } else {
        toast.success('Welcome to QuickNote!')
        navigate('/app', { replace: true })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : friendlyError(err)
      setServerError(message)
      setErrors({})
    } finally {
      setSubmitting(false)
    }
  }

  const strengthTone = ['bg-red-400', 'bg-red-500', 'bg-amber-500', 'bg-brand-500', 'bg-emerald-500']
  const rules = [
    { ok: form.password.length >= 8, text: 'At least 8 characters' },
    { ok: /[a-zA-Z]/.test(form.password), text: 'Contains a letter' },
    { ok: /[0-9]/.test(form.password), text: 'Contains a number' },
  ]

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start capturing ideas in seconds. Free to get started."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
          >
            {serverError}
          </div>
        )}

        <Field label="Full name" htmlFor="su-name" required error={errors.fullName}>
          <Input
            id="su-name"
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={form.fullName}
            invalid={Boolean(errors.fullName)}
            onChange={(e) => set('fullName')(e.target.value)}
          />
        </Field>

        <Field label="Email address" htmlFor="su-email" required error={errors.email}>
          <Input
            id="su-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            invalid={Boolean(errors.email)}
            onChange={(e) => set('email')(e.target.value)}
          />
        </Field>

        <Field label="Password" htmlFor="su-password" required error={errors.password}>
          <div className="relative">
            <Input
              id="su-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
              value={form.password}
              invalid={Boolean(errors.password)}
              onChange={(e) => set('password')(e.target.value)}
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

        {/* Strength meter */}
        {form.password && (
          <div aria-live="polite">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < strength.score ? strengthTone[strength.score] : 'bg-zinc-200 dark:bg-white/10',
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Password strength: <span className="font-medium">{strength.label}</span>
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              {rules.map((r) => (
                <li
                  key={r.text}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs',
                    r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400',
                  )}
                >
                  {r.ok ? <Check className="h-3 w-3" aria-hidden /> : <X className="h-3 w-3" aria-hidden />}
                  {r.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Confirm password" htmlFor="su-confirm" required error={errors.confirmPassword}>
          <Input
            id="su-confirm"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            invalid={Boolean(errors.confirmPassword)}
            onChange={(e) => set('confirmPassword')(e.target.value)}
          />
        </Field>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => set('acceptTerms')(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-[#4f46e5]"
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400">
                Privacy Policy
              </Link>
            </span>
          </label>
          {errors.acceptTerms && (
            <p role="alert" className="mt-1.5 text-[0.8rem] font-medium text-red-600 dark:text-red-400">
              {errors.acceptTerms}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create Account
        </Button>
      </form>
    </AuthLayout>
  )
}
