-- Isolated staging only: one private text/metadata draft per collector. No photos.
create table public.listing_drafts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 content jsonb not null check (coalesce(jsonb_typeof(content)='object' and content->'version'='1'::jsonb and jsonb_typeof(content->'fields')='object' and octet_length(content::text)<=32768,false)),
 updated_at timestamptz not null default now()
);
alter table public.listing_drafts enable row level security;
revoke all on public.listing_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.listing_drafts to authenticated;
create policy owner_reads_draft on public.listing_drafts for select to authenticated using ((select auth.uid())=user_id);
create policy owner_inserts_draft on public.listing_drafts for insert to authenticated with check ((select auth.uid())=user_id);
create policy owner_updates_draft on public.listing_drafts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy owner_deletes_draft on public.listing_drafts for delete to authenticated using ((select auth.uid())=user_id);
notify pgrst,'reload schema';
