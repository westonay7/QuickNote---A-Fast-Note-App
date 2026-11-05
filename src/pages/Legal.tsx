import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-surface-dark/85">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo size="sm" to="/" />
          <Link
            to="/"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to QuickNote
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Last updated: {updated}</p>
        <div className="card mt-8 space-y-7 p-6 text-sm leading-relaxed text-zinc-600 sm:p-8 dark:text-zinc-300">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          Questions? Contact your support address configured by the operator of this QuickNote
          instance.
        </p>
      </main>
    </div>
  )
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{children}</h2>
}

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="October 2026">
      <section className="space-y-3">
        <H2>What we store</H2>
        <p>
          QuickNote stores your account email, display name, and the notes, folders and tags you
          create. This data is stored in a Supabase (PostgreSQL) project and is tied to your user
          account.
        </p>
      </section>
      <section className="space-y-3">
        <H2>How your data is protected</H2>
        <p>
          Authentication is handled by Supabase Auth. Database access is protected with Row Level
          Security (RLS), which means every read, write and delete is restricted to your authenticated
          user ID at the database level. Other users cannot read or modify your notes.
        </p>
        <p>
          QuickNote does not encrypt note contents end-to-end. Notes are encrypted in transit (HTTPS)
          and at rest according to your Supabase project's configuration.
        </p>
      </section>
      <section className="space-y-3">
        <H2>What we do not collect</H2>
        <p>
          QuickNote does not include third-party analytics, advertising trackers, or crash reporters
          by default. Note contents are never logged by the application. Local browser storage is
          used only for non-sensitive UI preferences (theme, sort defaults) and temporary unsaved
          drafts — never as the database for your notes.
        </p>
      </section>
      <section className="space-y-3">
        <H2>Your choices</H2>
        <p>
          You can export your notes at any time from Settings → Data & storage, and you can delete
          your account and all associated data from Settings → Privacy & security. Deleting your
          account permanently removes your notes, folders, tags and profile.
        </p>
      </section>
      <section className="space-y-3">
        <H2>Service providers</H2>
        <p>
          QuickNote relies on Supabase for authentication, database hosting and storage. See the
          Supabase privacy policy for details on how infrastructure data is handled.
        </p>
      </section>
    </LegalLayout>
  )
}

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="October 2026">
      <section className="space-y-3">
        <H2>1. Using QuickNote</H2>
        <p>
          QuickNote is a personal notes application. You may use it to create, organize and export
          your own notes. You are responsible for the content you write and for keeping your
          credentials secret.
        </p>
      </section>
      <section className="space-y-3">
        <H2>2. Accounts</H2>
        <p>
          You must provide an accurate email address and keep your password secure. One person may
          not use another person's account, and accounts may not be used to store or distribute
          unlawful content.
        </p>
      </section>
      <section className="space-y-3">
        <H2>3. Your content</H2>
        <p>
          You own the notes you write. You grant QuickNote only the permission needed to store and
          display your notes back to you. You can export or delete your data at any time.
        </p>
      </section>
      <section className="space-y-3">
        <H2>4. Availability</H2>
        <p>
          The service is provided "as is". Features may change over time. We aim for high
          availability but do not guarantee uninterrupted access; regular exports are recommended.
        </p>
      </section>
      <section className="space-y-3">
        <H2>5. Termination</H2>
        <p>
          You can delete your account from Settings at any time. We may suspend accounts that
          violate these terms, and where feasible we will notify the account owner first.
        </p>
      </section>
      <section className="space-y-3">
        <H2>6. Acceptance</H2>
        <p>By creating an account you agree to these terms and to the Privacy Policy.</p>
      </section>
    </LegalLayout>
  )
}
