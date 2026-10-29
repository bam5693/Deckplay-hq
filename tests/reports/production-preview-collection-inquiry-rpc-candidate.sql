-- Staging-reviewed collection inquiry RPC candidate. DO NOT deploy until production clone authorization tests.
-- Requires collection-inquiries table candidate and six-column profiles candidate.
begin;
create or replace function private.send_collection_inquiry(p_recipient uuid,p_item text,p_intent text,p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $fn$
declare uid uuid := auth.uid(); target public.profiles; mid uuid;
begin
 if uid is null or p_recipient is null or uid=p_recipient then raise exception 'Choose another collector and sign in'; end if;
 if p_item is null or length(trim(p_item)) not between 3 and 300 or p_body is null or length(trim(p_body)) not between 1 and 1200 or p_intent is null or p_intent not in ('buy','trade') then raise exception 'Add an item reference and a short inquiry'; end if;
 perform 1 from public.profiles where id in (uid,p_recipient) order by id for update;
 select * into target from public.profiles where id=p_recipient;
 if not found or target.collection_inquiry_mode='off' or jsonb_array_length(target.collection_links)=0 or (target.collection_inquiry_mode='trades' and p_intent<>'trade') then raise exception 'This collector is not accepting that collection inquiry'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient) or (blocker_id=p_recipient and blocked_id=uid)) then raise exception 'Collection inquiry unavailable'; end if;
 if exists(select 1 from private.collection_inquiries where sender_id=uid and recipient_id=p_recipient and lower(trim(item_reference))=lower(trim(p_item))) then raise exception 'You already inquired about this item'; end if;
 if exists(select 1 from private.collection_inquiries where sender_id=uid and recipient_id=p_recipient and created_at>now()-interval '24 hours') or (select count(*) from private.collection_inquiries where sender_id=uid and created_at>now()-interval '24 hours')>=5 then raise exception 'Collection inquiry limit reached'; end if;
 insert into public.collector_messages(sender_id,recipient_id,body) values(uid,p_recipient,'Collection inquiry ('||p_intent||') — '||trim(p_item)||E'\n'||trim(p_body)||E'\nShared collection only; availability is not confirmed. A DeckPlay listing is required before a transaction.') returning id into mid;
 insert into private.collection_inquiries(sender_id,recipient_id,item_reference,message_id) values(uid,p_recipient,trim(p_item),mid);
 return mid;
end;
$fn$;
revoke all on function private.send_collection_inquiry(uuid,text,text,text) from public,anon;
grant execute on function private.send_collection_inquiry(uuid,text,text,text) to authenticated;
create or replace function public.send_collection_inquiry(p_recipient uuid,p_item text,p_intent text,p_body text)
returns uuid language sql security invoker set search_path = ''
as $fn$ select private.send_collection_inquiry(p_recipient,p_item,p_intent,p_body); $fn$;
revoke all on function public.send_collection_inquiry(uuid,text,text,text) from public,anon;
grant execute on function public.send_collection_inquiry(uuid,text,text,text) to authenticated;
-- Authenticated EXECUTE on private function is necessary for the invoker wrapper; private schema remains unexposed through the API. The private function enforces auth.uid(), opt-in, blocks, duplication and rate limits.
commit;
