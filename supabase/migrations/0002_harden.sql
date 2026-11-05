-- ============================================================
-- QuickNote — hardening pass
--
--   * lock the search_path of the trigger helpers,
--   * remove the API's EXECUTE privilege from internal functions
--     (Supabase's default privileges grant EXECUTE on every new
--     function in `public` to anon/authenticated/service_role),
--   * move pg_trgm out of the `public` schema.
--
-- Run after 0001_quicknote.sql.
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bump_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.version = old.version then
    new.version = old.version + 1;
  end if;
  return new;
end;
$$;

-- Trigger helpers are never called through the API.
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.bump_version()     from public, anon, authenticated;
revoke all on function public.handle_new_user()  from public, anon, authenticated;

-- RPCs: signed-in users only.
revoke all on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;

revoke all on function public.search_my_notes(text) from public, anon;
grant  execute on function public.search_my_notes(text) to authenticated;

-- Supabase's own RLS auto-enable helper: event-trigger only, not an API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- pg_trgm belongs in the extensions schema, not public.
drop index if exists public.notes_search_idx;
drop extension if exists pg_trgm;
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create index if not exists notes_search_idx
  on public.notes using gin (title extensions.gin_trgm_ops, content extensions.gin_trgm_ops);
