-- Biblia AI — donation records (anonymous auth, own rows only)

create table if not exists public.donations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  amount_pln  integer     not null check (amount_pln > 0),
  tier        text        not null check (tier in ('supporter', 'patron', 'mecenas')),
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists idx_donations_user
  on public.donations (user_id, created_at desc);

alter table public.donations enable row level security;

drop policy if exists donations_select_own on public.donations;
create policy donations_select_own
  on public.donations
  for select
  to authenticated, anon
  using (auth.uid() = user_id);

drop policy if exists donations_insert_own on public.donations;
create policy donations_insert_own
  on public.donations
  for insert
  to authenticated, anon
  with check (auth.uid() = user_id);

-- Optional profile summary for quick reads
alter table public.user_profiles
  add column if not exists donor_tier text check (donor_tier in ('supporter', 'patron', 'mecenas')),
  add column if not exists total_donated_pln integer not null default 0 check (total_donated_pln >= 0),
  add column if not exists last_donation_at timestamptz;
