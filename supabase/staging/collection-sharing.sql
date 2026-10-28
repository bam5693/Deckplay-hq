-- Isolated staging only: prrrzeelltmyugssqnzk. Additive, no inventory or commerce changes.
alter table public.profiles add column collection_links jsonb not null default '[]'::jsonb;
alter table public.profiles add column collection_inquiry_mode text not null default 'off'
 check (collection_inquiry_mode in ('off','trades','buy_trade'));
create function private.valid_collection_links(links jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare entry jsonb; url text; host text;
begin
 if jsonb_typeof(links)<>'array' or jsonb_array_length(links)>3 then return false;end if;
 for entry in select value from jsonb_array_elements(links) loop
  if entry->>'label' is null or entry->>'url' is null or jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'label')<>'string' or jsonb_typeof(entry->'url')<>'string' then return false;end if;
  url:=entry->>'url';host:=substring(url from '^https://([^/]+)');
  if length(entry->>'label') not between 1 and 50 or length(url)>500 or url !~ '^https://([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,63}(/[^[:space:]<>"?\\#]*)?$'
   or host ~* '(^|\.)(localhost|local|internal|test|invalid|example)$' then return false;end if;
 end loop;
 return true;
end $$;
revoke all on function private.valid_collection_links(jsonb) from public,anon;
grant execute on function private.valid_collection_links(jsonb) to authenticated;
alter table public.profiles add constraint valid_collection_links check (private.valid_collection_links(collection_links));
create table private.collection_inquiries (
 id uuid primary key default gen_random_uuid(), sender_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),item_reference text not null,
 message_id uuid not null references public.collector_messages(id), created_at timestamptz not null default now()
);
alter table private.collection_inquiries enable row level security;
create policy deny_client_access on private.collection_inquiries for all to authenticated using (false) with check (false);
revoke all on private.collection_inquiries from public,anon,authenticated;
create index collection_inquiries_sender_time on private.collection_inquiries(sender_id,created_at desc);
create function private.send_collection_inquiry(p_recipient uuid,p_item text,p_intent text,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target public.profiles; mid uuid;
begin
 if uid is null or p_recipient is null or uid=p_recipient then raise exception 'Choose another collector and sign in';end if;
 if p_item is null or length(trim(p_item)) not between 3 and 300 or p_body is null or length(trim(p_body)) not between 1 and 1200 or p_intent is null or p_intent not in ('buy','trade') then raise exception 'Add a card or item reference and a short inquiry';end if;
 -- Serialize first contact limits and preference changes, locking both profiles in a stable order.
 perform 1 from public.profiles where id in (uid,p_recipient) order by id for update;
 select * into target from public.profiles where id=p_recipient;
 if not found or target.collection_inquiry_mode='off' or jsonb_array_length(target.collection_links)=0
  or (target.collection_inquiry_mode='trades' and p_intent<>'trade') then raise exception 'This collector is not accepting that collection inquiry';end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=p_recipient) or (blocker_id=p_recipient and blocked_id=uid)) then raise exception 'Collection inquiry unavailable';end if;
 if exists(select 1 from private.collection_inquiries where sender_id=uid and recipient_id=p_recipient and lower(trim(item_reference))=lower(trim(p_item))) then raise exception 'You already inquired about this item. Continue in your inbox';end if;
 if exists(select 1 from private.collection_inquiries where sender_id=uid and recipient_id=p_recipient and created_at>now()-interval '24 hours')
  or (select count(*) from private.collection_inquiries where sender_id=uid and created_at>now()-interval '24 hours')>=5 then raise exception 'Collection inquiry limit reached. Continue existing conversations or try tomorrow';end if;
 insert into public.collector_messages(sender_id,recipient_id,body) values(uid,p_recipient,'Collection inquiry ('||p_intent||') — '||trim(p_item)||E'\n'||trim(p_body)||E'\nShared collection only; availability is not confirmed. A DeckPlay listing is required before a transaction.') returning id into mid;
 insert into private.collection_inquiries(sender_id,recipient_id,item_reference,message_id) values(uid,p_recipient,trim(p_item),mid);
 return mid;
end $$;
create function public.send_collection_inquiry(p_recipient uuid,p_item text,p_intent text,p_body text) returns uuid
language sql security invoker set search_path='' as $$select private.send_collection_inquiry(p_recipient,p_item,p_intent,p_body)$$;
revoke all on function public.send_collection_inquiry(uuid,text,text,text),private.send_collection_inquiry(uuid,text,text,text) from public,anon;
grant execute on function public.send_collection_inquiry(uuid,text,text,text),private.send_collection_inquiry(uuid,text,text,text) to authenticated;
