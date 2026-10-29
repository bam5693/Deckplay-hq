-- DeckPlay HQ candidate: private drafts and seller follows.
-- NOT FOR PRODUCTION EXECUTION until backup/rollback and release integration tests.
-- No existing accounts, profiles or listings are modified.
begin;
create table if not exists public.listing_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content jsonb not null check (
    coalesce(jsonb_typeof(content) = 'object'
      and content->'version' = '1'::jsonb
      and jsonb_typeof(content->'fields') = 'object'
      and octet_length(content::text) <= 32768, false)
  ),
  updated_at timestamptz not null default now()
);
alter table public.listing_drafts enable row level security;
create policy owner_reads_draft on public.listing_drafts for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_inserts_draft on public.listing_drafts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_updates_draft on public.listing_drafts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_deletes_draft on public.listing_drafts for delete to authenticated using ((select auth.uid()) = user_id);
grant select,insert,update,delete on public.listing_drafts to authenticated;

create table if not exists public.seller_follows (
 follower_id uuid not null references auth.users(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,seller_id),
 constraint seller_follows_no_self_follow check (follower_id <> seller_id)
);
alter table public.seller_follows enable row level security;
create policy "Members follow sellers" on public.seller_follows for insert to authenticated with check (follower_id=(select auth.uid()));
create policy "Members read their follows" on public.seller_follows for select to authenticated using (follower_id=(select auth.uid()));
create policy "Members unfollow sellers" on public.seller_follows for delete to authenticated using (follower_id=(select auth.uid()));
grant select,insert,delete on public.seller_follows to authenticated;
commit;
