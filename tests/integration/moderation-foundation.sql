-- Run only on prrrzeelltmyugssqnzk through a trusted SQL connection.
-- Database authorization simulation, not a real signed MFA/API journey.
-- Every fixture, temporary grant and audit event is rolled back atomically.
begin;
do $$
declare actor uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); factor uuid:=gen_random_uuid(); report uuid:=gen_random_uuid();
begin
 perform set_config('deckplay.test_actor',actor::text,true);
 perform set_config('deckplay.test_session',sid::text,true);
 perform set_config('deckplay.test_factor',factor::text,true);
 perform set_config('deckplay.test_report',report::text,true);
 insert into auth.users(id,email,raw_user_meta_data) values(actor,'moderation-rollback-'||actor||'@deckplay.test','{}');
 insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values(factor,actor,'totp','verified',now(),now());
 insert into auth.sessions(id,user_id,factor_id,aal,created_at,updated_at,not_after)
 values(sid,actor,factor,'aal2',now(),now(),now()+interval '10 minutes');
 insert into public.user_reports(id,reporter_id,reason,details)
 values(report,actor,'counterfeit','ROLLBACK ONLY synthetic evidence');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2','session_id',sid,'user_metadata',jsonb_build_object('moderator',true))::text,true);
end $$;
set local role authenticated;
do $$ begin
 if public.is_deckplay_moderator() then raise exception 'User metadata must not grant a role'; end if;
 begin perform public.moderation_report_queue();raise exception 'Collector read unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'resolved','Synthetic review reason','open');raise exception 'Collector write unexpectedly succeeded';exception when insufficient_privilege then null;end;
 begin perform 1 from deckplay_admin.moderators;raise exception 'Role table readable';exception when insufficient_privilege then null;end;
 begin insert into deckplay_admin.moderators(user_id,grant_reason) values(auth.uid(),'Self grant attempt');raise exception 'Self grant succeeded';exception when insufficient_privilege then null;end;
 begin perform 1 from deckplay_admin.audit_events;raise exception 'Audit log readable';exception when insufficient_privilege then null;end;
 begin insert into public.user_reports(reporter_id,reason,status) values(auth.uid(),'other','resolved');raise exception 'Reporter selected resolved status';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into deckplay_admin.moderators(user_id,grant_reason)
values(current_setting('deckplay.test_actor')::uuid,'ROLLBACK ONLY synthetic moderator');
set local role authenticated;
do $$ begin
 if not public.is_deckplay_moderator() then raise exception 'Valid synthetic MFA moderator denied';end if;
 perform public.moderation_report_queue();
 begin perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'resolved','','open');raise exception 'Empty reason accepted';exception when invalid_parameter_value then null;end;
 begin perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'banned','Synthetic review reason','open');raise exception 'Unknown status accepted';exception when invalid_parameter_value then null;end;
 perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'reviewing','Synthetic evidence under review.','open');
 begin perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'resolved','Stale synthetic review attempt.','open');raise exception 'Stale review overwrote status';exception when serialization_failure then null;end;
 perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'resolved','Synthetic evidence reviewed.','reviewing');
 -- A password-only JWT cannot use the otherwise valid grant/session.
 perform set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{aal}','"aal1"')::text,true);
 if public.is_deckplay_moderator() then raise exception 'AAL1 was accepted';end if;
 begin perform public.moderation_report_queue();raise exception 'AAL1 queue read succeeded';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{aal}','"aal2"')::text,true);
end $$;
reset role;
do $$ begin
 if (select status from public.user_reports where id=current_setting('deckplay.test_report')::uuid)<>'resolved' then raise exception 'Review did not persist within test';end if;
 if (select count(*) from deckplay_admin.audit_events where target_id=current_setting('deckplay.test_report')::uuid and action='report_review')<>2 then raise exception 'Review/audit atomicity failed';end if;
 if not exists(select 1 from deckplay_admin.audit_events where actor_id=current_setting('deckplay.test_actor')::uuid and action='queue_read') then raise exception 'Queue read not audited';end if;
 if not exists(select 1 from deckplay_admin.audit_events where target_id=current_setting('deckplay.test_actor')::uuid and action='moderator_grant') then raise exception 'Role grant not audited';end if;
end $$;
update deckplay_admin.moderators set enabled=false where user_id=current_setting('deckplay.test_actor')::uuid;
set local role authenticated;
do $$ begin
 if public.is_deckplay_moderator() then raise exception 'Revoked grant remained active';end if;
 begin perform public.moderation_report_queue();raise exception 'Revoked grant read succeeded';exception when insufficient_privilege then null;end;
end $$;
reset role;
update deckplay_admin.moderators set enabled=true where user_id=current_setting('deckplay.test_actor')::uuid;
update auth.sessions set not_after=now()-interval '1 minute' where id=current_setting('deckplay.test_session')::uuid;
set local role authenticated;
do $$ begin
 if public.is_deckplay_moderator() then raise exception 'Expired session accepted';end if;
end $$;
reset role;
update auth.sessions set not_after=now()+interval '10 minutes' where id=current_setting('deckplay.test_session')::uuid;
update auth.mfa_factors set status='unverified' where id=current_setting('deckplay.test_factor')::uuid;
set local role authenticated;
do $$ begin
 if public.is_deckplay_moderator() then raise exception 'Unverified MFA factor accepted';end if;
end $$;
reset role;
update auth.mfa_factors set status='verified' where id=current_setting('deckplay.test_factor')::uuid;
-- The synthetic token references a nonexistent session; no actual session deletion.
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{session_id}',to_jsonb(gen_random_uuid()::text))::text,true);
set local role authenticated;
do $$ begin
 if public.is_deckplay_moderator() then raise exception 'Missing/revoked session accepted';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.is_deckplay_moderator();raise exception 'Anonymous role probe succeeded';exception when insufficient_privilege then null;end;
 begin perform public.moderation_report_queue();raise exception 'Anonymous queue read succeeded';exception when insufficient_privilege then null;end;
 begin perform public.review_deckplay_report(current_setting('deckplay.test_report')::uuid,'resolved','Synthetic anonymous attempt.','open');raise exception 'Anonymous review succeeded';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: moderator database authorization, review conflicts and audit assertions; fixtures rolled back' as result;
rollback;
