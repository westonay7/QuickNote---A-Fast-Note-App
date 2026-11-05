# QuickNote

A notes app MVP built with **React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase**.

Create, organize, search, and share your thoughts — with folders, tags, pinning,
favorites, archive, trash, full-text search, autosave with conflict detection,
import/export, dark mode, and accessibility built in.

---

## 1. Requirements

- Node.js 20+ (developed against Node 24)
- A free [Supabase](https://supabase.com) project

## 2. Setup

### 2.1 Install dependencies

```bash
npm install
```

### 2.2 Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the values from your Supabase project
(**Project Settings → API**):

| Variable | Where it comes from |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` public key |

> Only the **anon/public** key belongs in the frontend. It is safe to expose
> because every query is protected by Row Level Security. Never put the
> `service_role` key in `.env` or in source control.

Until these values exist, the app deliberately shows a **Setup screen**
instead of a login form — it never pretends to be configured.

### 2.3 Create the database schema

Open your Supabase project → **SQL Editor** and run these files **in order**,
pasting each one and pressing **Run**:

```
supabase/migrations/0001_quicknote.sql          -- tables, indexes, RLS, RPCs
supabase/migrations/0002_harden.sql             -- function privileges + search_path, pg_trgm
supabase/migrations/0003_user_id_defaults.sql   -- user_id defaults to auth.uid()
```

Together they create `profiles`, `folders`, `tags`, `notes`, `note_tags`, all
indexes, Row Level Security policies, the `delete_my_account()` and
`search_my_notes()` RPCs, and a `handle_new_user` trigger that creates a profile
for every new sign-up (plus a backfill for accounts that predate the trigger).

All three files are idempotent (`if not exists` / `or replace`), so re-running
them on an existing project is safe.

(Alternatively, with the Supabase CLI linked: `supabase db push`.)

### 2.4 Auth settings (recommended)

In **Authentication → Providers → Email**:

- Keep **Confirm email** enabled (the app handles both states).
- Set the Site URL to `http://localhost:5173` and add
  `http://localhost:5173/auth/callback` to the redirect allow-list.

In **Authentication → Settings**, enable **Leaked password protection** so
Supabase rejects passwords found in known breach corpora. (This is a dashboard
setting, not something the SQL migrations can turn on.)

### 2.5 Run

```bash
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle → dist/
npm run preview    # serve the production build
```

## 3. Feature overview

| Area | What works |
| --- | --- |
| **Welcome / Onboarding** | Product intro, 3-step onboarding after first sign-in |
| **Auth** | Sign up, sign in, forgot/reset password, email verification, OAuth callback — real Supabase Auth, no fake sessions |
| **Dashboard** | Counts (active/pinned/favorites/folders), recently opened, recently updated, quick folders |
| **Editor** | Title + body, **autosave** (debounced), save states, manual save (`Ctrl/Cmd+S`), local draft recovery |
| **Conflicts** | Optimistic concurrency via a `version` column — reload / overwrite / save-as-copy |
| **Organization** | Folders (create/rename/delete with move-picker), tags, pin, favorite, archive |
| **Trash** | Soft delete with restore (returns notes to their original folder) and *delete forever* |
| **Search** | Server-side ILIKE search across title/body/tags/folders, debounced |
| **Sort & filters** | Sort by updated/created/title, asc/desc; multi-select bulk move/archive/delete |
| **Settings** | Profile, appearance (light/dark/system, font size, reduced motion), editor defaults, data export/import, change password, delete account (re-auth required) |
| **Accessibility** | Landmarks, focus management, `aria-live` toasts, keyboard shortcuts (`Ctrl+K`, `N`, `Esc`), visible focus rings, reduced-motion support |
| **Responsive** | Mobile drawer navigation → tablet sidebar → desktop three-column layout |

## 4. Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Global search |
| `N` | New note (outside text inputs) |
| `Ctrl/Cmd + S` | Save current note |
| `Esc` | Close modal / drawer / menu |

## 5. Project structure

```
src/
  components/   UI kit, app shell, sidebar, header, note cards, modals
  hooks/        useNotesList, useCatalog, useNoteActions
  lib/          supabase client, api layer, validation, export/import, utils
  pages/        one file per screen
  state/        Toast, Preferences, Auth, DataContext providers
  index.css     design tokens (Tailwind 4 @theme)
supabase/
  migrations/   0001_quicknote.sql           — schema, indexes, RLS, RPCs
                0002_harden.sql              — privileges, search_path, pg_trgm
                0003_user_id_defaults.sql    — user_id → auth.uid()
```

## 6. Data model & security

- **Row Level Security on every table** — users can only ever read/write their
  own rows (`auth.uid() = user_id`), enforced in the database itself.
- **Optimistic concurrency**: `notes.version` increments on every update; the
  editor compares versions and shows a conflict dialog instead of silently
  overwriting.
- **Soft delete**: `deleted_at` powers Trash; `original_folder_id` restores
  notes to where they came from.
- **Account deletion**: `delete_my_account()` SECURITY DEFINER RPC removes the
  auth user and every dependent row in one transaction.

## 7. Known limitations (honest list)

- **No end-to-end encryption** — data is encrypted in transit and at rest by
  Supabase, but the server can read it. Don't store secrets here.
- **Offline is draft-only** — edits are kept locally and re-offered, but there
  is no background sync queue or full offline browsing.
- **Feedback opens your mail client** (`mailto:`) — there is no backend inbox.
- **Trash cleanup is client-driven** — old trashed notes are not yet purged by
  a scheduled database job.
- **Search is `ILIKE`-based** (with trigram indexes), not full Postgres FTS
  ranking.

## 8. License

MIT — use it for anything.
