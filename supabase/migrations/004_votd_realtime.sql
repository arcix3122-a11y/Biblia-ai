-- Biblia AI — live updates for Verse of the Day social tables.
-- Adds votd_comments / votd_likes to the Supabase realtime publication so new
-- comments and likes stream to subscribed clients without a manual refresh.
-- RLS still applies per receiving user, so anon subscribers only get rows they
-- are allowed to read (read_all policies from 003_votd_social.sql).

alter publication supabase_realtime add table public.votd_comments;
alter publication supabase_realtime add table public.votd_likes;

-- DELETE events must carry the primary key so clients can remove the row.
-- Default replica identity = primary key already provides this; set explicitly.
alter table public.votd_comments replica identity default;
alter table public.votd_likes replica identity default;
