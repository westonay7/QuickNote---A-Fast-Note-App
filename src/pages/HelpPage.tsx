import { Link } from "react-router-dom";
import { LifeBuoy, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const FAQS = [
  {
    q: "How do I create a note?",
    a: "Click New note in the header or sidebar, or press N from anywhere in the app. You can also create notes from the Dashboard or any filtered view — they inherit that folder and tags.",
  },
  {
    q: "When are my changes saved?",
    a: "Automatically. QuickNote saves a couple of seconds after you stop typing, and immediately when you click Save or leave the editor. A status pill at the top of the editor tells you exactly what is happening.",
  },
  {
    q: "What happens if I edit the same note in two tabs?",
    a: "QuickNote tracks a version number per note. If the copy on the server changed since you opened the editor, you get a conflict notice with a choice: reload the latest version, overwrite it with yours, or save yours as a separate note.",
  },
  {
    q: "How do I get a note back after deleting it?",
    a: "Deleted notes go to Trash and stay there for 30 days. Open Trash and use Restore to bring a note back to its previous folder, or Delete forever to remove it immediately.",
  },
  {
    q: "Can I use QuickNote offline?",
    a: "Browsing needs a connection, but anything you type is kept as a local draft so it is never lost. The editor says Waiting for connection until your changes can be synced.",
  },
  {
    q: "Does QuickNote encrypt my notes?",
    a: "Data is encrypted in transit and at rest by Supabase, and is only visible to your account through row-level security. There is no end-to-end encryption, so do not store passwords or highly sensitive secrets here.",
  },
  {
    q: "How do I move several notes into a folder?",
    a: "Open the folder (or All notes), click Select, tick the notes you want, then choose Move and pick the destination.",
  },
  {
    q: "How do I export or import my notes?",
    a: "Settings → Data & export. Export downloads a single JSON backup of everything. Import previews the file first and never deletes anything — notes marked as updated bring over their latest content.",
  },
];

export function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Help" description="Answers to the most common questions about QuickNote." />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <LifeBuoy className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
            Getting started
          </h3>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            <li>Create your first note with New note.</li>
            <li>Group related notes into a folder.</li>
            <li>Add tags like work or ideas to cut across folders.</li>
            <li>Pin the notes you need every day.</li>
            <li>Use search (Ctrl K) to find anything instantly.</li>
          </ol>
        </div>
        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <MessageSquare className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
            Keyboard shortcuts
          </h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            {(
              [
                ["Search", "Ctrl K"],
                ["New note", "N"],
                ["Save note", "Ctrl S"],
                ["Close dialog / drawer", "Esc"],
              ] as const
            ).map(([label, keys]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
                <kbd className="rounded-md border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300">
                  {keys}
                </kbd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Frequently asked questions</h2>
        <div className="card mt-3 divide-y divide-zinc-200 overflow-hidden dark:divide-white/10">
          {FAQS.map((item) => (
            <details key={item.q} className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-brand-500/40 dark:text-zinc-100">
                {item.q}
                <span
                  className="text-zinc-400 transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 card p-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Still need a hand?</h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Send feedback and include what you were trying to do.
          </p>
        </div>
        <Link
          to="/feedback"
          className="inline-flex h-10 shrink-0 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-soft transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          Send feedback
        </Link>
      </div>
    </div>
  );
}

export default HelpPage;
