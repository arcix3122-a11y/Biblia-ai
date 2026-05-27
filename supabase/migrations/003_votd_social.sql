-- Biblia AI — community engagement on Verse of the Day (likes + comments)
-- Anonymous Supabase users can like a verse once and post comments;
-- counts and comment threads are readable by everyone (including anon).
-- Requires Anonymous sign-in enabled in Supabase Dashboard.

-- ---------------------------------------------------------------------------
-- votd_likes
-- ---------------------------------------------------------------------------
create table if not exists public.votd_likes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  verse_ref   text        not null check (length(verse_ref) between 3 and 64),
  created_at  timestamptz not null default timezone('utc', now()),
  unique (user_id, verse_ref)
);

create index if not exists idx_votd_likes_verse
  on public.votd_likes (verse_ref, created_at desc);

alter table public.votd_likes enable row level security;

-- Anyone (even anon, even unauthenticated reader of public app) may read counts.
drop policy if exists votd_likes_read_all on public.votd_likes;
create policy votd_likes_read_all
  on public.votd_likes
  for select
  to authenticated, anon
  using (true);

-- Only own user can insert / delete their like row.
drop policy if exists votd_likes_insert_own on public.votd_likes;
create policy votd_likes_insert_own
  on public.votd_likes
  for insert
  to authenticated, anon
  with check (auth.uid() = user_id);

drop policy if exists votd_likes_delete_own on public.votd_likes;
create policy votd_likes_delete_own
  on public.votd_likes
  for delete
  to authenticated, anon
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- votd_comments
-- ---------------------------------------------------------------------------
create table if not exists public.votd_comments (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  verse_ref   text        not null check (length(verse_ref) between 3 and 64),
  body        text        not null check (length(body) between 1 and 600),
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists idx_votd_comments_verse
  on public.votd_comments (verse_ref, created_at desc);

alter table public.votd_comments enable row level security;

-- Anyone may read all comments for any verse.
drop policy if exists votd_comments_read_all on public.votd_comments;
create policy votd_comments_read_all
  on public.votd_comments
  for select
  to authenticated, anon
  using (true);

-- Only the comment author can insert as themselves.
drop policy if exists votd_comments_insert_own on public.votd_comments;
create policy votd_comments_insert_own
  on public.votd_comments
  for insert
  to authenticated, anon
  with check (auth.uid() = user_id);

-- Only the comment author may delete their own comment.
drop policy if exists votd_comments_delete_own on public.votd_comments;
create policy votd_comments_delete_own
  on public.votd_comments
  for delete
  to authenticated, anon
  using (auth.uid() = user_id);
