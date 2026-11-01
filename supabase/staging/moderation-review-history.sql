-- STAGING-ONLY REVIEW CANDIDATE (T8.4): apply manually after integration review.
-- Requires supabase/staging/moderation-foundation.sql and its private audit_events table.
-- This read-only API returns no actor IDs, session IDs, or report details.
create or replace function deckplay_admin.report_review_history(p_report_id uuid)
returns table(reviewed_at timestamptz, previous_status text, next_status text, review_reason text)
language plpgsql security definer set search_path = '' as $$
begin
 if not deckplay_admin.has_moderator_access() then
  raise exception 'Active MFA moderator session required' using errcode='42501';
 end if;
 if p_report_id is null then
  raise exception 'Report ID required' using errcode='22023';
 end if;
 return query
 select e.created_at,e.old_status,e.new_status,e.reason
 from deckplay_admin.audit_events e
 where e.target_id=p_report_id and e.action='report_review'
 order by e.created_at desc,e.id desc
 limit 20;
end;
$$;
revoke all on function deckplay_admin.report_review_history(uuid) from public,anon,authenticated;
grant execute on function deckplay_admin.report_review_history(uuid) to authenticated;

create or replace function public.moderation_report_review_history(p_report_id uuid)
returns table(reviewed_at timestamptz, previous_status text, next_status text, review_reason text)
language sql security invoker set search_path = '' as $$
 select * from deckplay_admin.report_review_history(p_report_id);
$$;
revoke all on function public.moderation_report_review_history(uuid) from public,anon,authenticated;
grant execute on function public.moderation_report_review_history(uuid) to authenticated;
