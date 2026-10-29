-- STAGING ONLY: durable health reports from the dedicated test runner.
begin;
update auth.users set raw_app_meta_data=raw_app_meta_data||'{"deckplay_test_runner":true}'::jsonb where email='deckplay-seller@deckplay.test';
create table public.staging_test_runs(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(), suite text not null,
 passed boolean not null, checks jsonb not null, error text
);
alter table public.staging_test_runs enable row level security;
grant select,insert on public.staging_test_runs to authenticated;
create policy "Runner reads own health reports" on public.staging_test_runs for select to authenticated using(user_id=(select auth.uid()) and (select auth.jwt()->'app_metadata'->>'deckplay_test_runner')='true');
create policy "Runner writes own health reports" on public.staging_test_runs for insert to authenticated with check(user_id=(select auth.uid()) and (select auth.jwt()->'app_metadata'->>'deckplay_test_runner')='true');
notify pgrst,'reload schema';
commit;
