import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Cloud,
  FolderTree,
  Keyboard,
  Lock,
  Search,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Logo, NoteGlyph } from "@/components/Logo";

const SECTIONS = [
  {
    icon: Sparkles,
    title: "Capture in seconds",
    body: "Press N from anywhere to open a fresh note. QuickNote autosaves as you type — a status pill always tells you whether your words are saved, saving, or waiting for a connection.",
  },
  {
    icon: FolderTree,
    title: "Organize your way",
    body: "Folders hold projects, tags cut across them, and pin/favorite keep the important few at your fingertips. Archive finished work, and Trash keeps deletions recoverable for 30 days.",
  },
  {
    icon: Search,
    title: "Find anything fast",
    body: "Search runs across titles, note bodies, tags, and folder names. Jump straight to results with Ctrl K, then sort or filter until the right note is the only one left.",
  },
  {
    icon: Cloud,
    title: "Conflict-free sync",
    body: "Every note carries a version number. Edit on two devices and QuickNote will ask which version wins instead of silently overwriting somebody's work.",
  },
  {
    icon: Lock,
    title: "Private by design",
    body: "Row-level security in Postgres means the database itself refuses to show one person another person's notes. Your data is encrypted in transit and at rest.",
  },
  {
    icon: WifiOff,
    title: "Never lose a draft",
    body: "Go offline and your typing is kept as a local draft on the device. Reconnect and QuickNote offers it back — unsaved words never just disappear.",
  },
];

const KEYS: Array<[string, string]> = [
  ["Ctrl K", "Open search"],
  ["N", "Create a new note"],
  ["Ctrl S", "Save the current note"],
  ["Esc", "Close dialogs and drawers"],
];

export function Introduction() {
  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>
        <Logo size="sm" />
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/70 dark:text-brand-300">
            <NoteGlyph size={14} />
            Product tour
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Everything QuickNote can do
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
            Six things worth knowing before you write your first note. No jargon — just what the
            app does and why it helps.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ icon: Icon, title, body }) => (
            <section key={title} className="card flex flex-col p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/70 dark:text-brand-300">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
            </section>
          ))}
        </div>

        <section className="card mt-8 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Keyboard className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
            Keyboard shortcuts
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {KEYS.map(([keys, action]) => (
              <div key={keys} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/5">
                <dt className="text-sm text-zinc-600 dark:text-zinc-300">{action}</dt>
                <kbd className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-300">
                  {keys}
                </kbd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand-600 px-7 text-[0.95rem] font-semibold text-white shadow-raised transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            >
              Create your account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/signin"
              className="inline-flex h-12 items-center rounded-xl border border-zinc-200 bg-white px-7 text-[0.95rem] font-medium text-zinc-700 shadow-soft transition hover:bg-zinc-50 dark:border-white/10 dark:bg-surface-dark dark:text-zinc-200 dark:hover:bg-white/5"
            >
              Sign in instead
            </Link>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-zinc-400">
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            Works on phones, tablets, and desktops — your notes follow your account.
          </p>
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-6 text-xs text-zinc-400 sm:px-6">
        <span>© {new Date().getFullYear()} QuickNote</span>
        <Link to="/legal/privacy" className="transition hover:text-zinc-600 dark:hover:text-zinc-300">
          Privacy Policy
        </Link>
        <Link to="/legal/terms" className="transition hover:text-zinc-600 dark:hover:text-zinc-300">
          Terms of Service
        </Link>
      </footer>
    </div>
  );
}

export default Introduction;
