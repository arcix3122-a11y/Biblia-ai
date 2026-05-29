-- Biblia AI — server-verified donations.
-- Only the `verify-donation` Edge Function (service role) may insert rows after
-- confirming the purchase token with the Google Play Developer API. Clients can
-- no longer self-insert, which prevents spoofing the donations table.

alter table public.donations
  add column if not exists verified    boolean     not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists refunded    boolean     not null default false,
  add column if not exists refunded_at timestamptz;

-- One donation row per Google Play purchase token (idempotent verification).
create unique index if not exists uq_donations_purchase_token
  on public.donations (purchase_token)
  where purchase_token is not null;

-- Remove direct client insert. Inserts now flow through the Edge Function, which
-- runs with the service role and bypasses RLS. Select-own stays so users can
-- read their own verified history.
drop policy if exists donations_insert_own on public.donations;
