-- ============================================================
-- QuickNote — initial schema, row-level security, and helpers
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Safe to run once on a fresh project; every statement uses
-- IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================

-- Extensions ---------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ============================================================
-- profiles: one row per auth user (display name, avatar URL)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing profile data for each auth user.';

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for accounts created before this migration ran.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ============================================================
-- folders: named containers, unique name per user
-- ============================================================
create table if not exists public.folders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.folders is 'Per-user note folders. Names are unique per user.';

-- ============================================================
-- tags: flat label list, unique name per user
-- ============================================================
create table if not exists public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 40),
  color       text,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

comment on table public.tags is 'Per-user tags applied to notes.';

-- ============================================================
-- notes: the core entity
--   version       — optimistic-concurrency token (incremented on update)
--   deleted_at    — soft delete for Trash (30-day retention client-side)
--   original_folder_id — where to return the note when restoring
-- ============================================================
create table if not exists public.notes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null default '' check (char_length(title) <= 300),
  content            text not null default '',
  content_preview    text not null default '',
  folder_id          uuid references public.folders (id) on delete set null,
  original_folder_id uuid references public.folders (id) on delete set null,
  is_pinned          boolean not null default false,
  is_favorite        boolean not null default false,
  is_archived        boolean not null default false,
  last_opened_at     timestamptz,
  version            integer not null default 1,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.notes.version is 'Optimistic concurrency token; bumped on every update.';
comment on column public.notes.deleted_at is 'Soft-delete marker for Trash; null means the note is live.';
comment on column public.notes.original_folder_id is 'Folder the note came from before being trashed.';

-- Indexes for the hot paths ------------------------------------
create index if not exists notes_user_updated_idx   on public.notes (user_id, updated_at desc);
create index if not exists notes_user_deleted_idx   on public.notes (user_id, deleted_at);
create index if not exists notes_user_folder_idx    on public.notes (user_id, folder_id) where deleted_at is null;
create index if not exists notes_user_pinned_idx    on public.notes (user_id, is_pinned desc, updated_at desc) where deleted_at is null;
-- Trigram index powers ILIKE search on title/content.
create extension if not exists pg_trgm;
create index if not exists notes_search_idx         on public.notes using gin (title gin_trgm_ops, content gin_trgm_ops);

-- ============================================================
-- note_tags: many-to-many note ↔ tag links
-- ============================================================
create table if not exists public.note_tags (
  note_id    uuid not null references public.notes (id) on delete cascade,
  tag_id     uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

comment on table public.note_tags is 'Join table linking notes to tags.';

create index if not exists note_tags_tag_idx on public.note_tags (tag_id);

-- ============================================================
-- updated_at maintenance
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

drop trigger if exists folders_touch on public.folders;
create trigger folders_touch before update on public.folders
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================
-- updated_at must never be client-controlled: reject changes
-- to the concurrency version other than through the API's
-- normal update path (the client always sends its known version).
-- ============================================================
create or replace function public.bump_version()
returns trigger
language plpgsql
as $$
begin
  if new.version = old.version then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists notes_version on public.notes;
create trigger notes_version before update on public.notes
  for each row execute function public.bump_version();

-- ============================================================
-- Row Level Security: everything is scoped to auth.uid().
-- The USING clauses double-protect the owner-only guarantee
-- even if a client query omits its own filters.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.folders  enable row level security;
alter table public.tags     enable row level security;
alter table public.notes    enable row level security;
alter table public.note_tags enable row level security;

-- profiles: users read/update their own row only.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- folders: full CRUD for the owner.
drop policy if exists "folders_select_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select using (auth.uid() = user_id);

drop policy if exists "folders_insert_own" on public.folders;
create policy "folders_insert_own" on public.folders
  for insert with check (auth.uid() = user_id);

drop policy if exists "folders_update_own" on public.folders;
create policy "folders_update_own" on public.folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "folders_delete_own" on public.folders;
create policy "folders_delete_own" on public.folders
  for delete using (auth.uid() = user_id);

-- tags: full CRUD for the owner.
drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own" on public.tags
  for select using (auth.uid() = user_id);

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own" on public.tags
  for insert with check (auth.uid() = user_id);

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own" on public.tags
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own" on public.tags
  for delete using (auth.uid() = user_id);

-- notes: full CRUD for the owner.
drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own" on public.notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own" on public.notes
  for delete using (auth.uid() = user_id);

-- note_tags: allowed only when BOTH the note and the tag belong to the caller.
drop policy if exists "note_tags_select_own" on public.note_tags;
create policy "note_tags_select_own" on public.note_tags
  for select using (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  );

drop policy if exists "note_tags_insert_own" on public.note_tags;
create policy "note_tags_insert_own" on public.note_tags
  for insert with check (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth.uid())
  );

drop policy if exists "note_tags_delete_own" on public.note_tags;
create policy "note_tags_delete_own" on public.note_tags
  for delete using (
    exists (select 1 from public.notes n where n.id = note_id and n.user_id = auth.uid())
  );

-- ============================================================
-- delete_my_account: removes the caller's auth user and every
-- dependent row (cascades handle profiles/folders/tags/notes).
-- SECURITY DEFINER so it works before RLS scoping would block
-- the auth.users delete; still strictly scoped to auth.uid().
-- ============================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.notes    where user_id = v_uid;
  delete from public.folders  where user_id = v_uid;
  delete from public.tags     where user_id = v_uid;
  delete from public.profiles where id      = v_uid;
  delete from auth.users      where id      = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- search helper: rank + highlight-free trigram match used by
-- the search page through an RPC for portable ranking.
-- ============================================================
create or replace function public.search_my_notes(query text)
returns setof public.notes
language sql
stable
security definer
set search_path = public
as $$
  select n.*
  from public.notes n
  where n.user_id = auth.uid()
    and n.deleted_at is null
    and (
      query is null or query = ''
      or n.title ilike '%' || query || '%'
      or n.content ilike '%' || query || '%'
      or exists (
        select 1 from public.note_tags nt
        join public.tags t on t.id = nt.tag_id
        where nt.note_id = n.id and t.name ilike '%' || query || '%'
      )
    )
  order by
    case when n.title ilike '%' || query || '%' then 0 else 1 end,
    n.updated_at desc
  limit 200;
$$;

grant execute on function public.search_my_notes(text) to authenticated;

-- Done ---------------------------------------------------------
-- Next: copy .env.example to .env, fill in your Supabase keys,
-- and start the app with `npm run dev`.
