-- Biblia AI — client-side error logging (matches SolidCode Apps error_logs pattern)
-- Readable only via service_role; anon/authenticated may INSERT only.

create table if not exists public.error_logs (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default timezone('utc', now()),
  app_name      text        not null default 'biblia-ai',
  error_message text        not null,
  error_stack   text,
  device_info   jsonb,
  user_id       uuid        references auth.users(id) on delete set null
);

create index if not exists idx_error_logs_created_at
  on public.error_logs (created_at desc);

create index if not exists idx_error_logs_user_id
  on public.error_logs (user_id)
  where user_id is not null;

create index if not exists idx_error_logs_app_name
  on public.error_logs (app_name, created_at desc);

alter table public.error_logs enable row level security;

drop policy if exists error_logs_insert_anon on public.error_logs;
drop policy if exists error_logs_insert_authenticated on public.error_logs;

create policy error_logs_insert_anon
  on public.error_logs
  for insert
  to anon
  with check (true);

create policy error_logs_insert_authenticated
  on public.error_logs
  for insert
  to authenticated
  with check (true);
