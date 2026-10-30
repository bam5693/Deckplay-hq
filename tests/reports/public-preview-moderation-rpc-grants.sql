-- DeckPlay HQ public-preview candidate: narrow moderator RPC execution grants.
-- REVIEW ONLY: do not apply until production backup and rollback plan are verified.
-- Existing moderator functions already check auth.uid() against moderator_roles.
-- Remove PUBLIC/anon EXECUTE but retain authenticated and service_role.
begin;
revoke execute on function public.hide_deckplay_listing(uuid,uuid,text) from public, anon;
revoke execute on function public.is_deckplay_moderator() from public, anon;
revoke execute on function public.moderation_report_queue() from public, anon;
revoke execute on function public.review_deckplay_report(uuid,text,text) from public, anon;
grant execute on function public.hide_deckplay_listing(uuid,uuid,text) to authenticated, service_role;
grant execute on function public.is_deckplay_moderator() to authenticated, service_role;
grant execute on function public.moderation_report_queue() to authenticated, service_role;
grant execute on function public.review_deckplay_report(uuid,text,text) to authenticated, service_role;
commit;
-- Verify: pg_proc privileges for anon should be false; authenticated true.
-- Remaining anon-definer warnings (demo order RPCs) require separate auth-flow review.
