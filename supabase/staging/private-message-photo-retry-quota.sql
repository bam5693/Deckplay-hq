-- Isolated staging only. A retry of an already prepared, authorized attachment
-- is idempotent and must not consume another daily upload slot.
-- New attachment IDs still require a quota slot, and conversation/block checks
-- run before an existing ID can be returned.
create or replace function deckplay_chat.prepare_photo(p_id uuid,p_recipient uuid,p_message uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a public.message_photo_attachments;
begin
 if uid is null or p_id is null or p_recipient is null or p_message is null or uid=p_recipient then raise exception 'Conversation unavailable' using errcode='42501';end if;
 perform 1 from public.profiles where id=uid for update;if not found then raise exception 'Sign in required' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=p_recipient) or exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient) or (blocker_id=p_recipient and blocked_id=uid)) then raise exception 'Conversation unavailable' using errcode='42501';end if;
 if not exists(select 1 from public.collector_messages where (sender_id=uid and recipient_id=p_recipient) or (sender_id=p_recipient and recipient_id=uid)) and not exists(select 1 from public.price_offers where (buyer_id=uid and seller_id=p_recipient) or (buyer_id=p_recipient and seller_id=uid)) and not exists(select 1 from public.trade_offers where (sender_id=uid and recipient_id=p_recipient) or (sender_id=p_recipient and recipient_id=uid)) then raise exception 'Start a conversation before sharing photos' using errcode='42501';end if;
 select * into a from public.message_photo_attachments where id=p_id for update;
 if found then
  if a.sender_id<>uid or a.recipient_id<>p_recipient or a.draft_message_id<>p_message or a.status='canceled' then raise exception 'Photo draft unavailable' using errcode='42501';end if;
  return to_jsonb(a);
 end if;
 if (select count(*) from deckplay_chat.upload_events where user_id=uid and created_at>now()-interval '24 hours')>=30 then raise exception 'Photo upload limit reached. Try again tomorrow';end if;
 insert into deckplay_chat.upload_events(user_id) values(uid);
 if exists(select 1 from public.collector_messages where id=p_message) then raise exception 'This message was already sent';end if;
 if (select count(*) from public.message_photo_attachments where sender_id=uid and draft_message_id=p_message and status<>'canceled')>=3 then raise exception 'Choose up to three photos per message';end if;
 insert into public.message_photo_attachments(id,sender_id,recipient_id,draft_message_id,object_path) values(p_id,uid,p_recipient,p_message,uid::text||'/'||p_id::text||'.jpg') returning * into a;
 return to_jsonb(a);
end $$;
