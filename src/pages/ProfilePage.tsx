import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle2, KeyRound, LogOut, MailCheck, ShieldCheck, UserRound } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { PageHeader } from '@/components/PageHeader'
import { Badge, Button, Field, Input, Skeleton } from '@/components/ui'
import { changePassword, reauthenticate } from '@/lib/api'
import { friendlyError, getSupabase } from '@/lib/supabase'
import { fieldErrors, changePasswordSchema, profileSchema, type FieldErrors } from '@/lib/validation'
import { fullDate, initials } from '@/lib/format'
import { useAuth } from '@/state/AuthContext'
import { useToast } from '@/state/ToastContext'

export function ProfilePage() {
  const { profile, user, session, saveFullName, signOut, refreshProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(profile?.full_name ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [pwOpen, setPwOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwErrors, setPwErrors] = useState<FieldErrors>({})
  const [pwServer, setPwServer] = useState<string | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.full_name ?? '')
  }, [profile])

  const email = user?.email ?? session?.user.email ?? ''
  const verified = Boolean(session?.user.email_confirmed_at)
  const createdAt = user?.created_at ?? profile?.created_at ?? null

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = profileSchema.safeParse({ fullName: name })
    if (!parsed.success) {
      setNameError(fieldErrors(parsed.error).fullName ?? 'Enter a valid name.')
      return
    }
    setSavingName(true)
    try {
      await saveFullName(parsed.data.fullName)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSavingName(false)
    }
  }

  const savePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwServer(null)
    const parsed = changePasswordSchema.safeParse({
      currentPassword: current,
      password: next,
      confirmPassword: confirmPw,
    })
    if (!parsed.success) {
      setPwErrors(fieldErrors(parsed.error))
      return
    }
    setPwBusy(true)
    try {
      // Sensitive change: reauthenticate with the current password first
      await reauthenticate(email, parsed.data.currentPassword)
      await changePassword(parsed.data.password)
      toast.success('Password changed')
      setPwOpen(false)
      setCurrent('')
      setNext('')
      setConfirmPw('')
    } catch (err) {
      setPwServer(err instanceof Error ? err.message : friendlyError(err))
    } finally {
      setPwBusy(false)
    }
  }

  const signOutNow = async () => {
    await signOut()
    navigate('/signin', { replace: true })
  }

  const display = profile?.full_name || 'Your account'

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal details, password and account status."
        actions={
          <Button variant="secondary" onClick={() => void signOutNow()}>
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main column */}
        <div className="flex flex-col gap-6">
          {/* Identity card */}
          <section className="card p-6" aria-labelledby="personal-heading">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-soft"
              >
                {initials(display)}
              </span>
              <div className="min-w-0">
                <h2 id="personal-heading" className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {display}
                </h2>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{email || 'No email on file'}</p>
              </div>
            </div>

            <form onSubmit={saveName} className="mt-6 space-y-4">
              <Field label="Full name" htmlFor="pf-name" required error={nameError}>
                <Input
                  id="pf-name"
                  value={name}
                  maxLength={80}
                  invalid={Boolean(nameError)}
                  onChange={(e) => {
                    setName(e.target.value)
                    setNameError(null)
                  }}
                />
              </Field>
              <div className="flex items-center gap-3">
                <Button type="submit" loading={savingName} disabled={name === (profile?.full_name ?? '')}>
                  Save changes
                </Button>
                <span className="text-xs text-zinc-400">Used for your avatar initials and greeting.</span>
              </div>
            </form>
          </section>

          {/* Password */}
          <section className="card p-6" aria-labelledby="password-heading">
            <h2 id="password-heading" className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <KeyRound className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden /> Password
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Changing your password requires your current password for safety.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => setPwOpen(true)}>
              Change password
            </Button>
          </section>

          {/* Email verification */}
          <section className="card p-6" aria-labelledby="verify-heading">
            <h2 id="verify-heading" className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <MailCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden /> Email verification
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {verified ? (
                <>
                  <Badge tone="success">
                    <CheckCircle2 className="h-3 w-3" aria-hidden /> Verified
                  </Badge>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {email} is confirmed.
                  </span>
                </>
              ) : (
                <>
                  <Badge tone="warning">Pending verification</Badge>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Check your inbox for the confirmation link.
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      void getSupabase()
                        .auth.resend({ type: 'signup', email })
                        .then(({ error }) => {
                          if (error) throw new Error(friendlyError(error))
                          toast.success('Verification email resent')
                        })
                        .catch((e: unknown) => toast.error(friendlyError(e)))
                    }
                  >
                    Resend email
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Side column: account facts */}
        <aside className="flex flex-col gap-6">
          <section className="card p-6" aria-labelledby="account-heading">
            <h2 id="account-heading" className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <UserRound className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden /> Account
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Status</dt>
                <dd className="mt-1">
                  <Badge tone={verified ? 'success' : 'warning'}>
                    {verified ? 'Active & verified' : 'Awaiting verification'}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" aria-hidden /> Member since
                  </span>
                </dt>
                <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{createdAt ? fullDate(createdAt) : '—'}</dd>
              </div>
              {session?.user.last_sign_in_at && (
                <div>
                  <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">Last sign-in</dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">{fullDate(session.user.last_sign_in_at)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Your privacy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Your notes are protected by Supabase Row Level Security — only your authenticated
              session can read or modify them.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => navigate('/app/settings?section=privacy')}>
                Privacy & security settings
              </Button>
              {!profile && (
                <Button variant="ghost" onClick={() => void refreshProfile()}>
                  Reload profile
                </Button>
              )}
            </div>
          </section>

          {profileLoadingSkeleton(!profile)}
        </aside>
      </div>

      {/* Change password dialog */}
      <Modal
        open={pwOpen}
        onClose={() => {
          if (!pwBusy) {
            setPwOpen(false)
            setPwServer(null)
            setPwErrors({})
          }
        }}
        title="Change password"
        description="Enter your current password to confirm it's you, then choose a new one."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPwOpen(false)} disabled={pwBusy}>
              Cancel
            </Button>
            <Button type="submit" form="pw-form" loading={pwBusy}>
              Update password
            </Button>
          </>
        }
      >
        <form id="pw-form" onSubmit={savePassword} className="space-y-4">
          {pwServer && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300">
              {pwServer}
            </p>
          )}
          <Field label="Current password" htmlFor="pw-current" required error={pwErrors.currentPassword}>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={current}
              invalid={Boolean(pwErrors.currentPassword)}
              onChange={(e) => {
                setCurrent(e.target.value)
                setPwErrors((er) => ({ ...er, currentPassword: undefined }))
              }}
            />
          </Field>
          <Field label="New password" htmlFor="pw-new" required error={pwErrors.password} hint="At least 8 characters with a letter and a number.">
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={next}
              invalid={Boolean(pwErrors.password)}
              onChange={(e) => {
                setNext(e.target.value)
                setPwErrors((er) => ({ ...er, password: undefined }))
              }}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-confirm" required error={pwErrors.confirmPassword}>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              invalid={Boolean(pwErrors.confirmPassword)}
              onChange={(e) => {
                setConfirmPw(e.target.value)
                setPwErrors((er) => ({ ...er, confirmPassword: undefined }))
              }}
            />
          </Field>
        </form>
      </Modal>
    </>
  )
}

function profileLoadingSkeleton(show: boolean) {
  if (!show) return null
  return (
    <section className="card p-6" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-4 w-48" />
      <Skeleton className="mt-3 h-4 w-40" />
    </section>
  )
}
