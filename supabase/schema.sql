-- ============================================================
-- MindFlow Supabase schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- (Re-running is safe — uses CREATE OR REPLACE / IF NOT EXISTS.)
-- ============================================================

-- Maps table
-- `id` is `text` (not uuid) so that the client-generated nanoid map IDs
-- created in localStorage before Supabase was wired in still round-trip
-- after migration.
create table if not exists public.maps (
  id           text primary key,
  owner_id     uuid references auth.users(id) on delete cascade,
  title        text not null default 'Untitled Map',
  data         jsonb not null,
  share_slug   text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists maps_owner_idx       on public.maps(owner_id);
create index if not exists maps_share_slug_idx  on public.maps(share_slug);

-- Auto-update updated_at
create or replace function public.maps_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists maps_set_updated_at on public.maps;
create trigger maps_set_updated_at
  before update on public.maps
  for each row execute function public.maps_set_updated_at();

-- ============================================================
-- Row Level Security: owner-only direct access
-- ============================================================
alter table public.maps enable row level security;

drop policy if exists "owner_select" on public.maps;
create policy "owner_select" on public.maps
  for select using (auth.uid() = owner_id);

drop policy if exists "owner_insert" on public.maps;
create policy "owner_insert" on public.maps
  for insert with check (auth.uid() = owner_id);

drop policy if exists "owner_update" on public.maps;
create policy "owner_update" on public.maps
  for update using (auth.uid() = owner_id);

drop policy if exists "owner_delete" on public.maps;
create policy "owner_delete" on public.maps
  for delete using (auth.uid() = owner_id);

-- ============================================================
-- Public sharing via slug (RPC, security definer)
-- Bypasses RLS and lets ANY caller read/write a row identified
-- by its random slug. Slug is unguessable (nanoid, 16 chars).
-- ============================================================

create or replace function public.get_map_by_slug(p_slug text)
returns public.maps
language sql
security definer
set search_path = public
as $$
  select * from public.maps where share_slug = p_slug limit 1;
$$;

create or replace function public.update_map_by_slug(
  p_slug text,
  p_title text,
  p_data jsonb
)
returns public.maps
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.maps;
begin
  update public.maps
     set title = p_title,
         data  = p_data
   where share_slug = p_slug
   returning * into result;
  return result;
end;
$$;

-- Allow anon and authenticated to call these RPCs
grant execute on function public.get_map_by_slug(text)               to anon, authenticated;
grant execute on function public.update_map_by_slug(text, text, jsonb) to anon, authenticated;
