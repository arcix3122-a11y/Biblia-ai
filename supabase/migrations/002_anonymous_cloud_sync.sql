-- Biblia AI — anonymous cloud sync (highlights, notes, reading plans, user profile stats)
-- Requires Anonymous sign-in enabled in Supabase Dashboard: Authentication → Providers → Anonymous

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id                  uuid        primary key references auth.users (id) on delete cascade,
  streak_days         integer     not null default 0,
  daily_goal_chapters integer     not null default 1,
  language            text        not null default 'en' check (language in ('en', 'pl')),
  updated_at          timestamptz not null default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_own on public.user_profiles;
create policy user_profiles_own
  on public.user_profiles
  for all
  to authenticated, anon
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile row for new auth users (including anonymous)
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, streak_days, daily_goal_chapters, language)
  values (new.id, 0, 1, 'en')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- verse_highlights
-- ---------------------------------------------------------------------------
create table if not exists public.verse_highlights (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  book_slug   text        not null,
  chapter     integer     not null check (chapter > 0),
  verse       integer     not null check (verse > 0),
  color       text        not null check (color in ('gold', 'blue', 'green', 'rose')),
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  unique (user_id, book_slug, chapter, verse)
);

create index if not exists idx_verse_highlights_user
  on public.verse_highlights (user_id, updated_at desc);

alter table public.verse_highlights enable row level security;

drop policy if exists verse_highlights_own on public.verse_highlights;
create policy verse_highlights_own
  on public.verse_highlights
  for all
  to authenticated, anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_notes_sync
-- ---------------------------------------------------------------------------
create table if not exists public.user_notes_sync (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  title             text        not null default '',
  content           text        not null default '',
  reference_verses  text[]      not null default '{}',
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists idx_user_notes_sync_user
  on public.user_notes_sync (user_id, updated_at desc);

alter table public.user_notes_sync enable row level security;

drop policy if exists user_notes_sync_own on public.user_notes_sync;
create policy user_notes_sync_own
  on public.user_notes_sync
  for all
  to authenticated, anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reading_plans_progress
-- ---------------------------------------------------------------------------
create table if not exists public.reading_plans_progress (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  plan_slug       text        not null,
  completed_days  integer[]   not null default '{}',
  updated_at      timestamptz not null default timezone('utc', now()),
  unique (user_id, plan_slug)
);

create index if not exists idx_reading_plans_progress_user
  on public.reading_plans_progress (user_id, plan_slug);

alter table public.reading_plans_progress enable row level security;

drop policy if exists reading_plans_progress_own on public.reading_plans_progress;
create policy reading_plans_progress_own
  on public.reading_plans_progress
  for all
  to authenticated, anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
