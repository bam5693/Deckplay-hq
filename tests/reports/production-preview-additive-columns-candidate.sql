-- DeckPlay HQ production-only additive schema preparation (NOT APPROVED FOR EXECUTION).
-- Do not apply until verified restorable backup, production-schema clone test, and RLS/RPC/storage review.
-- Adds safe compatibility columns with defaults; does not copy staging data or modify accounts.
begin;
alter table public.collector_messages add column if not exists attachment_ids uuid[] not null default '{}'::uuid[];
alter table public.trade_offers add column if not exists offered_listing_ids uuid[] not null default '{}'::uuid[];
alter table public.trade_offers add column if not exists item_snapshots jsonb not null default '[]'::jsonb;
alter table public.trade_offers add column if not exists initial_terms jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists collection_links jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists collection_inquiry_mode text not null default 'off';
do $deckplay$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'deckplay_collection_inquiry_mode_check'
  ) then
    alter table public.profiles
      add constraint deckplay_collection_inquiry_mode_check
      check (collection_inquiry_mode in ('off','trades','buy_trade'));
  end if;
end;
$deckplay$;
-- Intentionally NOT adding staging's private.valid_collection_links() check until dependency is ported.
-- Intentionally NOT creating new tables here: RLS, policies, RPCs and storage must be ported together.
commit;
