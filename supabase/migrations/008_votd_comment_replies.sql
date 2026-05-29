-- Biblia AI - threaded replies for Verse of the Day comments.
-- Keeps the existing public read / own-write RLS model from 003_votd_social.sql.

alter table public.votd_comments
  add column if not exists parent_comment_id uuid
    references public.votd_comments (id) on delete cascade;

create index if not exists idx_votd_comments_parent
  on public.votd_comments (parent_comment_id, created_at asc);
