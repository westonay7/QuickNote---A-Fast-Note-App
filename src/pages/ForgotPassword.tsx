import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { appUrl } from '@/lib/appUrl'
import { Button, Field, Input } from '@/components/ui'
import { fieldErrors, forgotPasswordSchema, type FieldErrors } from '@/lib/validation'
import { friendlyError, getSupabase } from '@/lib/supabase'
import { useToast } from '@/state/ToastContext'

/**
 * Password recovery step 1: request a reset email.
 * Deliberately reveals nothing about whether the address has an account.
 */
export function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setServerError(null)
    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setSubmitting(true)
    try {
      await getSupabase().auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: appUrl('/reset-password'),
      })
      setSent(true)
      toast.success('Password reset email sent')
    } catch (err) {
      setServerError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle="Password reset instructions are on the way."
        footer={
          <>
            Remembered it?{' '}
            <Link to="/signin" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Back to Sign In
            </Link>
          </>
        }
      >
        <div className="card p-6 text-center animate-slide-up">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
            <MailCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            If an account exists for that address, a password reset link has been sent. For your
            privacy, we don't confirm whether an email is registered.
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            The link expires shortly. Don't forget to check your spam folder.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="secondary" onClick={() => setSent(false)}>
              Use a different email
            </Button>
            <Link
              to="/signin"
              className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure reset link."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/signin" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Back to Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
            {serverError}
          </div>
        )}
        <Field label="Email address" htmlFor="fp-email" required error={errors.email}>
          <Input
            id="fp-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => {
              setEmail(e.target.value)
              setErrors({})
            }}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthLayout>
  )
}
