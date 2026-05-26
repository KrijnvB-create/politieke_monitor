-- Politiekemonitor.com - Supabase schema
-- Paste everything into Supabase -> SQL Editor -> New query -> Run

create extension if not exists pgcrypto;

-- profiles ---------------------------------------------------------------
-- One row per logged-in user. Created automatically by the auth.users trigger.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- saved_items ------------------------------------------------------------
-- Anything a user bookmarks. The combination kind + ref_id points to an item
-- from the Tweede Kamer API, such as a dossier, member, motion or activity.
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  ref_id text not null,
  label text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);

alter table public.saved_items drop constraint if exists saved_items_kind_check;
alter table public.saved_items add constraint saved_items_kind_check
  check (kind in (
    'thema',
    'dossier',
    'kamerlid',
    'fractie',
    'motie',
    'stemming',
    'vergadering',
    'activiteit',
    'kamerbrief',
    'debat'
  ));

create index if not exists saved_items_user_created
  on public.saved_items (user_id, created_at desc);

alter table public.saved_items enable row level security;

drop policy if exists "saved_select_own" on public.saved_items;
create policy "saved_select_own"
  on public.saved_items for select
  using (auth.uid() = user_id);

drop policy if exists "saved_insert_own" on public.saved_items;
create policy "saved_insert_own"
  on public.saved_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_delete_own" on public.saved_items;
create policy "saved_delete_own"
  on public.saved_items for delete
  using (auth.uid() = user_id);

-- Checks:
-- select * from public.profiles;
-- select * from public.saved_items;
