import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MailOpen } from 'lucide-react'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui'
import { friendlyError, getSupabase } from '@/lib/supabase'
import { useToast } from '@/state/ToastContext'

/** Email-verification waiting state: "check your inbox" + resend action. */
export function VerifyEmail() {
  const location = useLocation()
  const toast = useToast()
  const email = (location.state as { email?: string } | null)?.email ?? ''
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearInterval(t)
  }, [cooldown])

  const resend = async () => {
    if (!email) return
    setResending(true)
    try {
      const { error } = await getSupabase().auth.resend({ type: 'signup', email })
      if (error) throw new Error(friendlyError(error))
      setCooldown(45)
      toast.success('Verification email resent')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resend the email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="One quick step to secure your account."
      footer={
        <>
          Wrong address?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Create a new account
          </Link>
        </>
      }
    >
      <div className="card p-6 text-center animate-slide-up">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
          <MailOpen className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
          {email ? (
            <>
              We sent a verification link to <span className="font-semibold text-zinc-900 dark:text-zinc-100">{email}</span>.
            </>
          ) : (
            <>We sent a verification link to your email address.</>
          )}
        </p>
        <p className="mt-3 text-xs text-zinc-400">
          Click the link in that email, then sign in. The link expires after a short time.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => void resend()}
            loading={resending}
            disabled={cooldown > 0 || !email}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </Button>
          <Link
            to="/signin"
            className="inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            I've verified — go to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
