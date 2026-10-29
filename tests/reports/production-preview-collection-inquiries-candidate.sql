-- DeckPlay HQ: collection inquiry history candidate, STAGING REVIEW ONLY.
-- Do not run in production before backup restore test and complete RPC authorization review.
-- Requires public.collector_messages and auth.users; does not alter existing rows.
begin;
create schema if not exists private;
create table if not exists private.collection_inquiries (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 item_reference text not null,
 message_id uuid not null references public.collector_messages(id),
 created_at timestamptz not null default now()
);
create index if not exists collection_inquiries_sender_time
 on private.collection_inquiries(sender_id,created_at desc);
alter table private.collection_inquiries enable row level security;
do $policy$
begin
 if not exists (select 1 from pg_policies where schemaname='private' and tablename='collection_inquiries' and policyname='deny_client_access') then
  create policy deny_client_access on private.collection_inquiries
   for all to authenticated using (false) with check (false);
 end if;
end;
$policy$;
revoke all on private.collection_inquiries from anon, authenticated;
commit;
