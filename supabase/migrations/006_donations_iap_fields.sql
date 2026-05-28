-- Biblia AI — IAP metadata on donation records (Google Play purchase token + SKU)

alter table public.donations
  add column if not exists product_id text,
  add column if not exists purchase_token text;

create index if not exists idx_donations_product
  on public.donations (product_id, created_at desc);
