-- Isolated production-shaped DB only. All action checks roll back; legacy rows persist.
begin;
do $$ begin
 if private.rehearsal_fingerprint() is distinct from (select fingerprint from private.rehearsal_canary) then raise exception 'Migration/restore changed existing rows';end if;
 if (select display_name from public.profiles where username='legacy_owner') is not null then raise exception 'Legacy nullable profile changed';end if;
 if exists(select 1 from public.trade_offers where id='30000000-0000-4000-8000-000000000001' and (cardinality(offered_listing_ids)<>0 or item_snapshots<>'[]' or initial_terms<>'{}')) then raise exception 'Fabricated historical snapshots';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.saved_listings)<>1 then raise exception 'Legacy Favorites disappeared';end if;
 -- Recorded old frontend uses a direct status update; keep its guarded cancellation path.
 update public.trade_offers set status='cancelled' where id='30000000-0000-4000-8000-000000000001';
 if not found then raise exception 'Previous frontend trade rollback path denied';end if;
 delete from public.saved_listings where listing_id='20000000-0000-4000-8000-000000000001';
 insert into public.saved_listings(user_id,listing_id) values(auth.uid(),'20000000-0000-4000-8000-000000000001');
 begin update public.trade_offers set offer_note='tampered' where id='30000000-0000-4000-8000-000000000001';raise exception 'Mutable terms granted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.saved_listings) then raise exception 'Outsider read Favorites';end if;
 if exists(select 1 from public.trade_offers) then raise exception 'Outsider read legacy trades';end if;
 if exists(select 1 from public.collector_messages) then raise exception 'Outsider read legacy messages';end if;
end $$;
reset role;
-- Real production role table plus synthetic active MFA/session. No new grant system.
insert into public.moderator_roles(user_id,role) values('10000000-0000-4000-8000-000000000001','moderator');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into auth.sessions(id,user_id,factor_id,aal,created_at,updated_at,not_after)
values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','aal2',now(),now(),now()+interval '1 hour');
insert into public.user_reports(id,reporter_id,reason) values('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','other');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1","session_id":"50000000-0000-4000-8000-000000000001"}',true);
do $$ begin
 if public.is_deckplay_moderator() then raise exception 'Moderator accepted without MFA';end if;
 begin perform public.review_deckplay_report('60000000-0000-4000-8000-000000000001','resolved','Synthetic review reason','open');raise exception 'AAL1 review succeeded';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2","session_id":"50000000-0000-4000-8000-000000000001"}',true);
do $$ begin
 if not public.is_deckplay_moderator() then raise exception 'Existing role not preserved';end if;
 perform public.review_deckplay_report('60000000-0000-4000-8000-000000000001','reviewing','Synthetic review reason','open');
 begin perform public.review_deckplay_report('60000000-0000-4000-8000-000000000001','resolved','Stale synthetic reason','open');raise exception 'Stale review overwrote state';exception when serialization_failure then null;end;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.moderation_actions where report_id='60000000-0000-4000-8000-000000000001')<>1 then raise exception 'Audit not atomic';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('submit_price_offer','respond_price_offer','respond_trade_offer','create_trade_counter','respond_trade_counter','send_collection_inquiry','seller_overview') and has_function_privilege('anon',p.oid,'execute')) then raise exception 'Anonymous mutation RPC';end if;
end $$;
rollback;
select 'Legacy data/Favorites unchanged; old frontend cancellation; outsider RLS; production moderator MFA/CAS/audit passed' as result;
