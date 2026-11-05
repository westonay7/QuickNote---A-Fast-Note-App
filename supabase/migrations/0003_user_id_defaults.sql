-- ============================================================
-- QuickNote — `user_id` defaults
--
-- The client inserts rows without an explicit `user_id` (folders
-- and tags send only `name`), so the column must default to the
-- caller. Combined with RLS this is also defence in depth: a
-- client can never write a row owned by somebody else.
--
-- Run after 0001_quicknote.sql.
-- ============================================================

alter table public.notes   alter column user_id set default auth.uid();
alter table public.folders alter column user_id set default auth.uid();
alter table public.tags    alter column user_id set default auth.uid();
