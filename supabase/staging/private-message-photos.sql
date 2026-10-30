-- Isolated staging only. Private files are written by the validating Edge Function,
-- never through authenticated direct Storage uploads or public listing buckets.
create schema deckplay_chat;
grant usage on schema deckplay_chat to anon,authenticated,service_role;
create table deckplay_chat.upload_events(user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
alter table deckplay_chat.upload_events enable row level security;
create policy deny_client_access on deckplay_chat.upload_events for all to authenticated using(false) with check(false);
revoke all on deckplay_chat.upload_events from public,anon,authenticated;
create index chat_upload_events_user_time on deckplay_chat.upload_events(user_id,created_at desc);

create table public.message_photo_attachments(
 id uuid primary key,
 sender_id uuid not null references auth.users(id),recipient_id uuid not null references auth.users(id),
 draft_message_id uuid not null,message_id uuid references public.collector_messages(id) on delete cascade,
 object_path text not null unique,status text not null default 'pending' check(status in ('pending','uploaded','attached','canceled')),
 source_hash text,file_hash text,byte_size integer check(byte_size between 1 and 2097152),
 created_at timestamptz not null default now(),check(sender_id<>recipient_id)
);
alter table public.message_photo_attachments enable row level security;
revoke all on public.message_photo_attachments from public,anon,authenticated;
grant select on public.message_photo_attachments to authenticated;
grant select,update,delete on public.message_photo_attachments to service_role;
create policy conversation_photo_reads on public.message_photo_attachments for select to authenticated
 using((select auth.uid())=sender_id or ((select auth.uid())=recipient_id and message_id is not null));
create index message_photo_message on public.message_photo_attachments(message_id);
create index message_photo_draft on public.message_photo_attachments(sender_id,draft_message_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('conversation-photos','conversation-photos',false,2097152,array['image/jpeg']);
create function deckplay_chat.can_read_photo(path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.message_photo_attachments a where a.object_path=path and a.status in('uploaded','attached') and (a.sender_id=auth.uid() or (a.recipient_id=auth.uid() and a.message_id is not null)))
$$;
revoke all on function deckplay_chat.can_read_photo(text) from public;
grant execute on function deckplay_chat.can_read_photo(text) to anon,authenticated;
create policy private_chat_photo_reads on storage.objects for select to authenticated using(bucket_id='conversation-photos' and deckplay_chat.can_read_photo(name));
-- Restrictive guards prevent any permissive legacy policy from widening this bucket.
create policy restrict_chat_photo_reads on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'conversation-photos' or deckplay_chat.can_read_photo(name));
create policy deny_direct_chat_photo_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'conversation-photos');
create policy deny_direct_chat_photo_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'conversation-photos') with check(bucket_id<>'conversation-photos');
create policy deny_direct_chat_photo_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'conversation-photos');

create function deckplay_chat.prepare_photo(p_id uuid,p_recipient uuid,p_message uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();a public.message_photo_attachments;
begin
 if uid is null or p_id is null or p_recipient is null or p_message is null or uid=p_recipient then raise exception 'Conversation unavailable' using errcode='42501';end if;
 perform 1 from public.profiles where id=uid for update;if not found then raise exception 'Sign in required' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=p_recipient) or exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient) or (blocker_id=p_recipient and blocked_id=uid)) then raise exception 'Conversation unavailable' using errcode='42501';end if;
 if not exists(select 1 from public.collector_messages where (sender_id=uid and recipient_id=p_recipient) or (sender_id=p_recipient and recipient_id=uid)) and not exists(select 1 from public.price_offers where (buyer_id=uid and seller_id=p_recipient) or (buyer_id=p_recipient and seller_id=uid)) and not exists(select 1 from public.trade_offers where (sender_id=uid and recipient_id=p_recipient) or (sender_id=p_recipient and recipient_id=uid)) then raise exception 'Start a conversation before sharing photos' using errcode='42501';end if;
 if (select count(*) from deckplay_chat.upload_events where user_id=uid and created_at>now()-interval '24 hours')>=30 then raise exception 'Photo upload limit reached. Try again tomorrow';end if;
 insert into deckplay_chat.upload_events(user_id) values(uid);
 select * into a from public.message_photo_attachments where id=p_id for update;
 if found then
  if a.sender_id<>uid or a.recipient_id<>p_recipient or a.draft_message_id<>p_message or a.status='canceled' then raise exception 'Photo draft unavailable' using errcode='42501';end if;
  return to_jsonb(a);
 end if;
 if exists(select 1 from public.collector_messages where id=p_message) then raise exception 'This message was already sent';end if;
 if (select count(*) from public.message_photo_attachments where sender_id=uid and draft_message_id=p_message and status<>'canceled')>=3 then raise exception 'Choose up to three photos per message';end if;
 insert into public.message_photo_attachments(id,sender_id,recipient_id,draft_message_id,object_path) values(p_id,uid,p_recipient,p_message,uid::text||'/'||p_id::text||'.jpg') returning * into a;
 return to_jsonb(a);
end $$;
create function public.prepare_private_message_photo(p_id uuid,p_recipient uuid,p_message uuid) returns jsonb language sql security invoker set search_path='' as $$select deckplay_chat.prepare_photo(p_id,p_recipient,p_message)$$;
revoke all on function deckplay_chat.prepare_photo(uuid,uuid,uuid),public.prepare_private_message_photo(uuid,uuid,uuid) from public,anon;
grant execute on function deckplay_chat.prepare_photo(uuid,uuid,uuid),public.prepare_private_message_photo(uuid,uuid,uuid) to authenticated;

create function deckplay_chat.claim_photo(p_id uuid,p_sender uuid,p_source text,p_hash text,p_size integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.message_photo_attachments;
begin
 if p_source is null or p_hash is null or p_source !~ '^[a-f0-9]{64}$' or p_hash !~ '^[a-f0-9]{64}$' or p_size is null or p_size not between 1 and 2097152 then raise exception 'Invalid validated photo';end if;
 select * into a from public.message_photo_attachments where id=p_id and sender_id=p_sender for update;
 if not found or a.status='canceled' then raise exception 'Photo draft unavailable';end if;
 if a.source_hash is not null and (a.source_hash<>p_source or a.file_hash<>p_hash or a.byte_size<>p_size) then raise exception 'Photo content cannot change during retry';end if;
 update public.message_photo_attachments set source_hash=p_source,file_hash=p_hash,byte_size=p_size where id=a.id returning * into a;return to_jsonb(a);
end $$;
create function public.claim_validated_private_photo(p_id uuid,p_sender uuid,p_source text,p_hash text,p_size integer) returns jsonb language sql security invoker set search_path='' as $$select deckplay_chat.claim_photo(p_id,p_sender,p_source,p_hash,p_size)$$;
revoke all on function deckplay_chat.claim_photo(uuid,uuid,text,text,integer),public.claim_validated_private_photo(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function deckplay_chat.claim_photo(uuid,uuid,text,text,integer),public.claim_validated_private_photo(uuid,uuid,text,text,integer) to service_role;

create function deckplay_chat.finish_photo(p_id uuid,p_sender uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.message_photo_attachments;
begin
 select * into a from public.message_photo_attachments where id=p_id and sender_id=p_sender for update;
 if not found or a.file_hash is null then raise exception 'Photo draft unavailable';end if;
 if a.status='pending' then
  if not exists(select 1 from storage.objects where bucket_id='conversation-photos' and name=a.object_path) then raise exception 'Photo upload unavailable';end if;
  update public.message_photo_attachments set status='uploaded' where id=a.id returning * into a;
 end if;return to_jsonb(a);
end $$;
create function public.finish_validated_private_photo(p_id uuid,p_sender uuid) returns jsonb language sql security invoker set search_path='' as $$select deckplay_chat.finish_photo(p_id,p_sender)$$;
revoke all on function deckplay_chat.finish_photo(uuid,uuid),public.finish_validated_private_photo(uuid,uuid) from public,anon,authenticated;
grant execute on function deckplay_chat.finish_photo(uuid,uuid),public.finish_validated_private_photo(uuid,uuid) to service_role;

alter table public.collector_messages add column attachment_ids uuid[] not null default '{}';
grant select(attachment_ids),insert(attachment_ids) on public.collector_messages to authenticated;
create function deckplay_chat.attach_photos() returns trigger language plpgsql security definer set search_path='' as $$
declare ids uuid[]:=new.attachment_ids;
begin
 if tg_op='UPDATE' then
  if new.attachment_ids is distinct from old.attachment_ids then raise exception 'Sent message photos cannot be changed';end if;return new;
 end if;
 if ids is null then raise exception 'Invalid message photos';end if;
 if cardinality(ids)=0 then return new;end if;
 if auth.uid() is null or auth.uid()<>new.sender_id or coalesce(array_ndims(ids),1)<>1 or cardinality(ids)>3 or array_position(ids,null) is not null or cardinality(ids)<>(select count(distinct id) from unnest(ids) id) then raise exception 'Invalid message photos';end if;
 perform 1 from public.message_photo_attachments where id=any(ids) order by id for update;
 if (select count(*) from public.message_photo_attachments a where a.id=any(ids) and a.sender_id=new.sender_id and a.recipient_id=new.recipient_id and a.draft_message_id=new.id and a.message_id is null and a.status='uploaded' and a.file_hash is not null and exists(select 1 from storage.objects o where o.bucket_id='conversation-photos' and o.name=a.object_path))<>cardinality(ids) then raise exception 'Finish uploading these photos before sending';end if;
 update public.message_photo_attachments set message_id=new.id,status='attached' where id=any(ids);return new;
end $$;
revoke all on function deckplay_chat.attach_photos() from public,anon,authenticated;
-- The attachment FK is deferred so the BEFORE INSERT trigger can link the new message atomically.
alter table public.message_photo_attachments drop constraint message_photo_attachments_message_id_fkey;
alter table public.message_photo_attachments add constraint message_photo_attachments_message_id_fkey foreign key(message_id) references public.collector_messages(id) on delete cascade deferrable initially deferred;
create trigger attach_private_photos before insert or update on public.collector_messages for each row execute function deckplay_chat.attach_photos();

create function deckplay_chat.cancel_photo(p_id uuid,p_sender uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.message_photo_attachments;
begin
 select * into a from public.message_photo_attachments where id=p_id and sender_id=p_sender for update;
 if not found then return null;end if;
 if a.message_id is not null then return to_jsonb(a);end if;
 update public.message_photo_attachments set status='canceled' where id=a.id returning * into a;return to_jsonb(a);
end $$;
create function public.cancel_unpublished_private_photo(p_id uuid,p_sender uuid) returns jsonb language sql security invoker set search_path='' as $$select deckplay_chat.cancel_photo(p_id,p_sender)$$;
revoke all on function deckplay_chat.cancel_photo(uuid,uuid),public.cancel_unpublished_private_photo(uuid,uuid) from public,anon,authenticated;
grant execute on function deckplay_chat.cancel_photo(uuid,uuid),public.cancel_unpublished_private_photo(uuid,uuid) to service_role;

create function deckplay_chat.fixture_paths(p_marker text) returns text[] language plpgsql security definer set search_path='' as $$
declare bots uuid[];paths text[];
begin
 select array_agg(id) into bots from auth.users where email in('deckplay-seller@deckplay.test','deckplay-buyer@deckplay.test');
 if coalesce(cardinality(bots),0)<>2 or auth.uid() is null or not(auth.uid()=any(bots)) or p_marker is null or p_marker !~ '^TEST ONLY BOT [a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' then raise exception 'Exact dedicated staging fixture required' using errcode='42501';end if;
 if exists(select 1 from public.collector_messages where body=p_marker and (not(sender_id=any(bots)) or not(recipient_id=any(bots)))) then raise exception 'Fixture has external participants';end if;
 select coalesce(array_agg(a.object_path),'{}') into paths from public.message_photo_attachments a join public.collector_messages m on m.id=a.message_id where m.body=p_marker and a.sender_id=any(bots) and a.recipient_id=any(bots);
 return paths;
end $$;
create function public.staging_private_photo_fixture_paths(p_marker text) returns text[] language sql security invoker set search_path='' as $$select deckplay_chat.fixture_paths(p_marker)$$;
revoke all on function deckplay_chat.fixture_paths(text),public.staging_private_photo_fixture_paths(text) from public,anon;
grant execute on function deckplay_chat.fixture_paths(text),public.staging_private_photo_fixture_paths(text) to authenticated;
notify pgrst,'reload schema';
