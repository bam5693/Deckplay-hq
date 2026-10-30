-- STAGING ONLY: prrrzeelltmyugssqnzk. No bootstrap grants or listing-removal API.
-- Privileged implementations stay outside the exposed public schema. Public
-- wrappers are invokers; narrow definer functions enforce every access check.
create schema deckplay_admin;
revoke all on schema deckplay_admin from public, anon, authenticated;
grant usage on schema deckplay_admin to authenticated;

create table deckplay_admin.moderators (
 user_id uuid primary key references auth.users(id),
 enabled boolean not null default true,
 granted_at timestamptz not null default now(),
 grant_reason text not null check (length(btrim(grant_reason)) between 8 and 1000)
);
alter table deckplay_admin.moderators enable row level security;
create policy deny_client_access on deckplay_admin.moderators for all to authenticated using (false) with check (false);
create table deckplay_admin.audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid,
 database_actor text not null default session_user,
 session_id uuid,
 action text not null check (action in ('queue_read','report_review','moderator_grant','moderator_change','moderator_revoke')),
 target_id uuid,
 old_status text,
 new_status text,
 reason text,
 created_at timestamptz not null default now()
);
alter table deckplay_admin.audit_events enable row level security;
create policy deny_client_access on deckplay_admin.audit_events for all to authenticated using (false) with check (false);
create index audit_events_target_created on deckplay_admin.audit_events(target_id,created_at desc);
revoke all on all tables in schema deckplay_admin from public,anon,authenticated;

create function deckplay_admin.has_moderator_access() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null
  and coalesce(auth.jwt()->>'aal','') = 'aal2'
  and exists (
   select 1 from deckplay_admin.moderators m
   join auth.sessions s on s.user_id=m.user_id
   join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
   where m.user_id=auth.uid() and m.enabled
    and s.id::text=auth.jwt()->>'session_id' and s.aal='aal2'
    and (s.not_after is null or s.not_after > now())
    and f.status='verified'
  );
$$;
revoke all on function deckplay_admin.has_moderator_access() from public,anon,authenticated;
grant execute on function deckplay_admin.has_moderator_access() to authenticated;

create function public.is_deckplay_moderator() returns boolean
language sql stable security invoker set search_path = '' as $$
 select deckplay_admin.has_moderator_access();
$$;
revoke all on function public.is_deckplay_moderator() from public,anon,authenticated;
grant execute on function public.is_deckplay_moderator() to authenticated;

create function deckplay_admin.report_queue()
returns table(id uuid,reported_id uuid,listing_id uuid,reason text,details text,status text,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
 if not deckplay_admin.has_moderator_access() then
  raise exception 'Moderator access with an active MFA session required' using errcode='42501';
 end if;
 insert into deckplay_admin.audit_events(actor_id,session_id,action)
 values(auth.uid(),(auth.jwt()->>'session_id')::uuid,'queue_read');
 return query select r.id,r.reported_id,r.listing_id,r.reason,r.details,r.status,r.created_at
 from public.user_reports r
 order by case r.status when 'open' then 0 when 'reviewing' then 1 else 2 end,r.created_at,r.id
 limit 100;
end;
$$;
revoke all on function deckplay_admin.report_queue() from public,anon,authenticated;
grant execute on function deckplay_admin.report_queue() to authenticated;
create function public.moderation_report_queue()
returns table(id uuid,reported_id uuid,listing_id uuid,reason text,details text,status text,created_at timestamptz)
language sql security invoker set search_path = '' as $$
 select * from deckplay_admin.report_queue();
$$;
revoke all on function public.moderation_report_queue() from public,anon,authenticated;
grant execute on function public.moderation_report_queue() to authenticated;

create function deckplay_admin.review_report(p_report_id uuid,p_status text,p_reason text,p_expected_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare previous_status text;
begin
 if not deckplay_admin.has_moderator_access() then
  raise exception 'Moderator access with an active MFA session required' using errcode='42501';
 end if;
 if p_status is null or p_status not in ('open','reviewing','resolved')
  or p_expected_status is null or p_expected_status not in ('open','reviewing','resolved')
  or p_reason is null or length(btrim(p_reason)) not between 8 and 1000 then
  raise exception 'A valid status and moderation reason (8–1,000 characters) are required' using errcode='22023';
 end if;
 select r.status into previous_status from public.user_reports r where r.id=p_report_id for update;
 if not found then raise exception 'Report unavailable' using errcode='P0002'; end if;
 if previous_status<>p_expected_status then
  raise exception 'Report changed; reload the queue before reviewing' using errcode='40001';
 end if;
 if previous_status=p_status then return; end if;
 update public.user_reports set status=p_status where id=p_report_id;
 insert into deckplay_admin.audit_events(actor_id,session_id,action,target_id,old_status,new_status,reason)
 values(auth.uid(),(auth.jwt()->>'session_id')::uuid,'report_review',p_report_id,previous_status,p_status,btrim(p_reason));
end;
$$;
revoke all on function deckplay_admin.review_report(uuid,text,text,text) from public,anon,authenticated;
grant execute on function deckplay_admin.review_report(uuid,text,text,text) to authenticated;
create function public.review_deckplay_report(p_report_id uuid,p_status text,p_reason text,p_expected_status text)
returns void language sql security invoker set search_path = '' as $$
 select deckplay_admin.review_report(p_report_id,p_status,p_reason,p_expected_status);
$$;
revoke all on function public.review_deckplay_report(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_deckplay_report(uuid,text,text,text) to authenticated;

-- Trusted SQL grants also leave an audit event; no client role-management API.
create function deckplay_admin.audit_moderator_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into deckplay_admin.audit_events(actor_id,session_id,action,target_id,old_status,new_status,reason)
 values(auth.uid(),null,case tg_op when 'INSERT' then 'moderator_grant' when 'DELETE' then 'moderator_revoke' else 'moderator_change' end,
  case when tg_op='DELETE' then old.user_id else new.user_id end,
  case when tg_op='INSERT' then null else old.enabled::text end,
  case when tg_op='DELETE' then null else new.enabled::text end,
  case when tg_op='DELETE' then old.grant_reason else new.grant_reason end);
 return null;
end;
$$;
revoke all on function deckplay_admin.audit_moderator_change() from public,anon,authenticated;
create trigger audit_moderator_grants after insert or update or delete on deckplay_admin.moderators
for each row execute function deckplay_admin.audit_moderator_change();

-- Reporters submit allegations; they cannot choose an already-reviewed status.
alter policy "Submit own reports" on public.user_reports
with check (reporter_id=(select auth.uid()) and status='open');
