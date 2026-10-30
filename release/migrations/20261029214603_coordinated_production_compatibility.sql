-- Production-specific coordinated release. DO NOT APPLY without final owner approval.
-- No existing rows are rewritten, deleted, or copied from staging. Favorites untouched.
-- Transactional: any failure aborts the complete migration. Retry only after diagnosis.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
alter table public.collector_messages add column if not exists attachment_ids uuid[] not null default '{}'::uuid[];
alter table public.trade_offers add column if not exists offered_listing_ids uuid[] not null default '{}'::uuid[];
alter table public.trade_offers add column if not exists item_snapshots jsonb not null default '[]'::jsonb;
alter table public.trade_offers add column if not exists initial_terms jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists collection_links jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists collection_inquiry_mode text not null default 'off';
alter table public.profiles add constraint deckplay_collection_inquiry_mode_check check (collection_inquiry_mode in ('off','trades','buy_trade'));
-- Isolated staging only: one private text/metadata draft per collector. No photos.
create table public.listing_drafts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 content jsonb not null check (coalesce(jsonb_typeof(content)='object' and content->'version'='1'::jsonb and jsonb_typeof(content->'fields')='object' and octet_length(content::text)<=32768,false)),
 updated_at timestamptz not null default now()
);
alter table public.listing_drafts enable row level security;
revoke all on public.listing_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.listing_drafts to authenticated;
create policy owner_reads_draft on public.listing_drafts for select to authenticated using ((select auth.uid())=user_id);
create policy owner_inserts_draft on public.listing_drafts for insert to authenticated with check ((select auth.uid())=user_id);
create policy owner_updates_draft on public.listing_drafts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy owner_deletes_draft on public.listing_drafts for delete to authenticated using ((select auth.uid())=user_id);

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
-- Staging-only marketplace activity notifications.
create table if not exists public.seller_follows (
 follower_id uuid not null references auth.users(id) on delete cascade,
 seller_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (follower_id,seller_id),
 constraint cannot_follow_self check (follower_id <> seller_id)
);
alter table public.seller_follows enable row level security;
create policy "Members read their follows" on public.seller_follows for select to authenticated using (follower_id = (select auth.uid()));
create policy "Members follow sellers" on public.seller_follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "Members unfollow sellers" on public.seller_follows for delete to authenticated using (follower_id = (select auth.uid()));
grant select,insert,delete on public.seller_follows to authenticated;

-- Staging-only: blocking severs follows in both directions and prevents re-following.
create or replace function private.enforce_follow_block_boundary()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if exists(select 1 from public.user_blocks b where (b.blocker_id=new.follower_id and b.blocked_id=new.seller_id) or (b.blocker_id=new.seller_id and b.blocked_id=new.follower_id)) then
  raise exception 'Cannot follow a blocked collector' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function private.enforce_follow_block_boundary() from public,anon,authenticated;
drop trigger if exists enforce_follow_block_boundary on public.seller_follows;
create trigger enforce_follow_block_boundary before insert or update on public.seller_follows for each row execute function private.enforce_follow_block_boundary();
create or replace function private.end_follows_on_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 delete from public.seller_follows sf where (sf.follower_id=new.blocker_id and sf.seller_id=new.blocked_id) or (sf.follower_id=new.blocked_id and sf.seller_id=new.blocker_id);
 return new;
end;
$$;
revoke all on function private.end_follows_on_block() from public,anon,authenticated;
drop trigger if exists end_follows_on_block on public.user_blocks;
create trigger end_follows_on_block after insert on public.user_blocks for each row execute function private.end_follows_on_block();
-- Suppress discovery notifications between collectors who have blocked each other.
create or replace function private.notify_new_listing_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status <> 'active' then return new; end if;
 insert into public.collector_notifications(user_id,actor_id,kind,source_id)
 select sf.follower_id,new.seller_id,'followed_seller_listing',new.id
 from public.seller_follows sf
 where sf.seller_id=new.seller_id
 and not exists(select 1 from public.user_blocks b where (b.blocker_id=sf.follower_id and b.blocked_id=new.seller_id) or (b.blocker_id=new.seller_id and b.blocked_id=sf.follower_id));
 insert into public.collector_notifications(user_id,actor_id,kind,source_id)
 select distinct wp.user_id,new.seller_id,'wanted_match',new.id
 from public.wanted_posts wp
 left join public.notification_preferences pref on pref.user_id=wp.user_id
 where coalesce(pref.wanted_matches,true)
 and wp.user_id <> new.seller_id
 and not exists(select 1 from public.user_blocks b where (b.blocker_id=wp.user_id and b.blocked_id=new.seller_id) or (b.blocker_id=new.seller_id and b.blocked_id=wp.user_id))
 and length(trim(wp.title)) >= 3
 and lower(new.title) like '%' || replace(replace(lower(trim(wp.title)),'%', '\%'),'_', '\_') || '%' escape '\'
 and (wp.budget is null or new.price <= wp.budget)
 and (wp.game is null or wp.game='' or wp.game='general' or wp.game=new.tcg_game or wp.game=new.category);
 return new;
end;
$$;
revoke all on function private.notify_new_listing_activity() from public,anon,authenticated;create trigger notify_new_listing_activity after insert on public.listings for each row execute function private.notify_new_listing_activity();
-- Expand the existing notification CHECK, preserving all supported legacy kinds.
alter table public.collector_notifications drop constraint collector_notifications_kind_check;
alter table public.collector_notifications add constraint collector_notifications_kind_check check(kind in ('message','trade_offer','counteroffer','trade_update','price_offer','price_counter','price_update','followed_seller_listing','wanted_match','favorite_price_drop','favorite_sold')) not valid;
-- Existing production notification uniqueness is retained. RPC notifications use upsert.
create or replace function private.notify(p_user uuid,p_actor uuid,p_kind text,p_source uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_user is null or p_user=p_actor or exists(select 1 from public.user_blocks where (blocker_id=p_user and blocked_id=p_actor) or (blocker_id=p_actor and blocked_id=p_user)) then return;end if;
 if coalesce((select case when p_kind='message' then messages else trade_offers end from public.notification_preferences where user_id=p_user),true) then
 insert into public.collector_notifications(user_id,actor_id,kind,source_id) values(p_user,p_actor,p_kind,p_source)
 on conflict(user_id,kind,source_id) do update set read_at=null,created_at=now();
 end if;
end $$;
revoke all on function private.notify(uuid,uuid,text,uuid) from public,anon,authenticated;
-- Replace ONLY conflicting transaction triggers. Keep message, deal, signup and Favorites protections.
drop trigger guard_trade_offer_update on public.trade_offers;
drop trigger deckplay_guard_trade_offer on public.trade_offers;
drop trigger enforce_trade_listing_agreement on public.trade_offers;
drop trigger notify_trade_created on public.trade_offers;
drop trigger notify_counter_created on public.trade_counteroffers;
drop trigger deckplay_guard_price_offer on public.price_offers;
drop trigger enforce_price_listing_agreement on public.price_offers;
drop trigger record_price_offer_history_event on public.price_offers;
drop trigger notify_price_offer_change on public.price_offers;
CREATE OR REPLACE FUNCTION private.trade_inventory_ids(t trade_offers)
 RETURNS uuid[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select coalesce(array_agg(distinct id order by id),'{}'::uuid[]) from unnest(array[t.listing_id,t.offered_listing_id]||t.offered_listing_ids) id where id is not null
$function$
;
CREATE OR REPLACE FUNCTION private.trade_listing_snapshot(l listings)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('listing_id',l.id,'owner_id',l.seller_id,'title',l.title,'description',l.description,'condition',l.condition,'category',l.category,'image_urls',l.image_urls,'asking_price',l.price)
$function$
;
CREATE OR REPLACE FUNCTION private.trade_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.listings; uid uuid:=auth.uid(); ids uuid[]; snap jsonb; saved public.listings;
begin
 if tg_op='UPDATE' then
  if row(new.id,new.created_at,new.sender_id,new.recipient_id,new.listing_id,new.offered_listing_id,new.offered_listing_ids,new.item_snapshots,new.initial_terms) is distinct from row(old.id,old.created_at,old.sender_id,old.recipient_id,old.listing_id,old.offered_listing_id,old.offered_listing_ids,old.item_snapshots,old.initial_terms) then raise exception 'Trade inventory is fixed. Send a new proposal to change items';end if;
  -- Validated acceptance routines may close competing proposals after reserving a shared item.
  if new.status='declined' and old.status='pending' and exists(select 1 from public.listings where id=any(private.trade_inventory_ids(old)) and status='reserved') then return new;end if;
 end if;
 if uid is null then raise exception 'Sign in required';end if;
 if tg_op='UPDATE' and new.status in ('cancelled','declined') then
  if old.status<>'pending' then raise exception 'Trade is closed';end if;
  if (new.status='cancelled' and uid<>old.sender_id) or (new.status='declined' and uid<>old.recipient_id) then raise exception 'Only the responding collector can close this trade';end if;
  perform private.notify(case when uid=new.sender_id then new.recipient_id else new.sender_id end,uid,'trade_update',new.id);return new;
 end if;
 if tg_op='INSERT' then
  if new.offered_listing_ids is null or coalesce(array_ndims(new.offered_listing_ids),1)<>1 or cardinality(new.offered_listing_ids)>5 or array_position(new.offered_listing_ids,null) is not null then raise exception 'Choose up to five distinct offered listings';end if;
  if cardinality(new.offered_listing_ids)=0 and new.offered_listing_id is not null then new.offered_listing_ids:=array[new.offered_listing_id];end if;
  if cardinality(new.offered_listing_ids)<>(select count(distinct id) from unnest(new.offered_listing_ids) id) then raise exception 'Choose each offered listing only once';end if;
  if new.offered_listing_id is not null and new.offered_listing_id is distinct from new.offered_listing_ids[1] then raise exception 'Primary offered item does not match inventory';end if;
  new.offered_listing_id:=new.offered_listing_ids[1];
  if new.listing_id=any(new.offered_listing_ids) then raise exception 'The requested listing cannot also be offered';end if;
 end if;
 ids:=private.trade_inventory_ids(new);
 -- Every competing offer path takes listing locks before proposal locks.
 perform 1 from public.listings where id=any(ids) order by id for update;
 select * into l from public.listings where id=new.listing_id;
 if l.id is null or l.status<>'active' then raise exception 'Listing is not available';end if;
 if new.sender_id=new.recipient_id or new.recipient_id<>l.seller_id then raise exception 'Invalid trade participants';end if;
 if (select count(*) from public.listings where id=any(ids))<>cardinality(ids) or exists(select 1 from public.listings where id=any(ids) and id<>new.listing_id and (seller_id<>new.sender_id or status<>'active')) then raise exception 'An offered item is unavailable or belongs to another collector';end if;
 if tg_op='INSERT' then
  if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.recipient_id) or (blocker_id=new.recipient_id and blocked_id=new.sender_id)) then raise exception 'Trade unavailable between these collectors';end if;
  if uid<>new.sender_id or new.status<>'pending' or not l.accepts_trades then raise exception 'Trade unavailable';end if;
  if length(trim(coalesce(new.offer_note,'')))=0 or length(new.offer_note)>1500 or new.cash_amount is null or new.cash_amount<0 or new.cash_amount>100000 or new.cash_direction is null or new.cash_direction not in ('none','sender_pays','recipient_pays') or (new.cash_direction='none' and new.cash_amount<>0) or (new.cash_direction<>'none' and new.cash_amount<=0) then raise exception 'Invalid trade terms';end if;
  new.initial_terms:=jsonb_build_object('note',new.offer_note,'cash_amount',new.cash_amount,'cash_direction',new.cash_direction);
  select jsonb_agg(private.trade_listing_snapshot(i)||jsonb_build_object('captured_at',now()) order by i.id) into new.item_snapshots from public.listings i where i.id=any(ids);
  perform private.notify(new.recipient_id,uid,'trade_offer',new.id);
 else
  if old.status<>'pending' then raise exception 'Trade is closed';end if;
  if new.status='cancelled' then
   if uid<>old.sender_id then raise exception 'Only sender can cancel';end if;
  elsif new.status in ('accepted','declined') then
   if uid<>old.recipient_id and not (new.status='accepted' and exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=old.id and c.recipient_id=uid and c.status='accepted')) then raise exception 'Only recipient can respond';end if;
  else raise exception 'Invalid trade action';end if;
  if new.status='accepted' then
   if exists(select 1 from public.trade_counteroffers where trade_offer_id=old.id and status='pending') then raise exception 'Respond to pending counteroffer first';end if;
   if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.recipient_id) or (blocker_id=new.recipient_id and blocked_id=new.sender_id)) then raise exception 'Trade unavailable between these collectors';end if;
   -- Legacy proposals have no snapshots; never fabricate historical terms for them.
   for snap in select value from jsonb_array_elements(old.item_snapshots) loop
    select * into saved from public.listings where id=(snap->>'listing_id')::uuid;
    if (snap-'captured_at') is distinct from private.trade_listing_snapshot(saved) then raise exception 'An item changed since this proposal. Review the listing and send a fresh trade';end if;
   end loop;
   update public.listings set status='reserved',updated_at=now() where id=any(ids);
  end if;
  perform private.notify(case when uid=new.sender_id then new.recipient_id else new.sender_id end,uid,'trade_update',new.id);
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION private.submit_price_offer(p_listing_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.listings; oid uuid; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select * into l from public.listings where id=p_listing_id for update;
 if not found or l.status<>'active' or not l.accepts_price_offers then raise exception 'Listing is not available for offers'; end if;
 if uid=l.seller_id then raise exception 'Cannot offer on your own listing'; end if;
 if p_amount is null or p_amount<=0 or p_amount>100000 then raise exception 'Invalid offer amount'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=l.seller_id) or (blocker_id=l.seller_id and blocked_id=uid)) then raise exception 'Offer unavailable'; end if;
 insert into public.price_offers(listing_id,buyer_id,seller_id,amount,last_actor_id,status) values(l.id,uid,l.seller_id,p_amount,uid,'pending') returning id into oid;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount) values(oid,l.id,uid,l.seller_id,uid,'submitted',p_amount);
 perform private.notify(l.seller_id,uid,'price_offer',oid);return oid;
end $function$
;
CREATE OR REPLACE FUNCTION private.respond_price_offer(p_offer_id uuid, p_action text, p_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.price_offers; l public.listings; uid uuid:=auth.uid(); target uuid;
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select listing_id into target from public.price_offers where id=p_offer_id and uid in (buyer_id,seller_id);
 if not found then raise exception 'Offer unavailable'; end if;
 select * into l from public.listings where id=target for update;
 select * into o from public.price_offers where id=p_offer_id for update;
 if o.status not in ('pending','countered') or l.status<>'active' then raise exception 'Offer or listing is closed'; end if;
 if p_action in ('accept','counter') and exists(select 1 from public.user_blocks where (blocker_id=o.buyer_id and blocked_id=o.seller_id) or (blocker_id=o.seller_id and blocked_id=o.buyer_id)) then raise exception 'Offer unavailable between these collectors';end if;
 if p_action='withdraw' then
 if uid<>o.buyer_id then raise exception 'Only buyer can withdraw'; end if;
 elsif uid=o.last_actor_id then raise exception 'Wait for the other collector'; end if;
 if p_action='counter' then
 if p_amount is null or p_amount<=0 or p_amount>100000 then raise exception 'Invalid counteroffer amount'; end if;
 update public.price_offers set amount=p_amount,status='countered',last_actor_id=uid,updated_at=now() where id=o.id;
 elsif p_action in ('accept','decline','withdraw') then
 update public.price_offers set status=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'withdrawn' end,last_actor_id=uid,updated_at=now() where id=o.id;
 if p_action='accept' then
 update public.listings set status='reserved',updated_at=now() where id=l.id;
 update public.price_offers set status='declined',updated_at=now() where listing_id=l.id and id<>o.id and status in ('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where (listing_id=l.id or offered_listing_id=l.id or l.id=any(offered_listing_ids)) and status='pending';
 end if;
 else raise exception 'Invalid offer action'; end if;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount) values(o.id,o.listing_id,o.buyer_id,o.seller_id,uid,p_action,case when p_action='counter' then p_amount else o.amount end);
 perform private.notify(case when uid=o.buyer_id then o.seller_id else o.buyer_id end,uid,case when p_action='counter' then 'price_counter' else 'price_update' end,o.id);
end $function$
;
CREATE OR REPLACE FUNCTION private.respond_trade_offer(p_offer uuid, p_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.trade_offers; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id=any(private.trade_inventory_ids(t)) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') and p_action='accepted' then raise exception 'Respond to the pending counteroffer first';end if;
 update public.trade_offers set status=p_action,updated_at=now() where id=t.id;
 if p_action='accepted' then
 update public.price_offers set status='declined',updated_at=now() where listing_id=any(private.trade_inventory_ids(t)) and status in('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where id<>t.id and (listing_id=any(private.trade_inventory_ids(t)) or offered_listing_id=any(private.trade_inventory_ids(t)) or offered_listing_ids && private.trade_inventory_ids(t)) and status='pending';
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION private.create_trade_counter(p_offer uuid, p_cash numeric, p_direction text, p_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.trade_offers; uid uuid:=auth.uid(); cid uuid;
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id=any(private.trade_inventory_ids(t)) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' or exists(select 1 from public.listings where id=any(private.trade_inventory_ids(t)) and status<>'active') then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.user_blocks where (blocker_id=t.sender_id and blocked_id=t.recipient_id) or (blocker_id=t.recipient_id and blocked_id=t.sender_id)) then raise exception 'Trade unavailable between these collectors';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') then raise exception 'A counteroffer is already pending';end if;
 if uid<>t.recipient_id then raise exception 'Only recipient can counter the original offer';end if;
 if p_cash is null or p_cash<0 or p_cash>100000 or p_direction is null or p_direction not in('none','sender_pays','recipient_pays') or (p_direction='none' and p_cash<>0) or (p_direction<>'none' and p_cash<=0) or length(trim(coalesce(p_note,''))) not between 1 and 1500 or round(p_cash,2)<>p_cash then raise exception 'Invalid counteroffer terms';end if;
 insert into public.trade_counteroffers(trade_offer_id,proposer_id,recipient_id,cash_amount,cash_direction,offer_note) values(t.id,uid,t.sender_id,p_cash,p_direction,coalesce(p_note,'')) returning id into cid;
 perform private.notify(t.sender_id,uid,'counteroffer',cid);return cid;
end $function$
;
CREATE OR REPLACE FUNCTION private.respond_trade_counter(p_counter uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.trade_counteroffers; t public.trade_offers; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into c from public.trade_counteroffers where id=p_counter and recipient_id=uid;
 if not found then raise exception 'Counteroffer unavailable';end if;
 select * into t from public.trade_offers where id=c.trade_offer_id;
 perform 1 from public.listings where id=any(private.trade_inventory_ids(t)) order by id for update;
 select * into t from public.trade_offers where id=c.trade_offer_id for update;
 select * into c from public.trade_counteroffers where id=p_counter for update;
 if c.status<>'pending' or t.status<>'pending' then raise exception 'Counteroffer is closed';end if;
 update public.trade_counteroffers set status=case when p_accept then 'accepted' else 'declined' end where id=c.id;
 if p_accept then
 -- Trigger verifies that the accepting actor is recipient of this accepted counter.
 update public.trade_offers set status='accepted',cash_amount=c.cash_amount,cash_direction=c.cash_direction,offer_note=c.offer_note,updated_at=now() where id=t.id;
 update public.price_offers set status='declined',updated_at=now() where listing_id=any(private.trade_inventory_ids(t)) and status in('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where id<>t.id and (listing_id=any(private.trade_inventory_ids(t)) or offered_listing_id=any(private.trade_inventory_ids(t)) or offered_listing_ids && private.trade_inventory_ids(t)) and status='pending';
 end if;
 perform private.notify(c.proposer_id,uid,'trade_update',t.id);
end $function$
;
drop policy "Members can propose trades" on public.trade_offers;
create policy release_trade_sender_insert on public.trade_offers for insert to authenticated with check(sender_id=(select auth.uid()) and status='pending');
create trigger guard_trade before insert or update on public.trade_offers for each row execute function private.trade_guard();
CREATE OR REPLACE FUNCTION public.submit_price_offer(p_listing_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.submit_price_offer(p_listing_id,p_amount)$function$
;
CREATE OR REPLACE FUNCTION public.respond_price_offer(p_offer_id uuid, p_action text, p_amount numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.respond_price_offer(p_offer_id,p_action,p_amount)$function$
;
CREATE OR REPLACE FUNCTION public.respond_trade_offer(p_offer uuid, p_action text)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.respond_trade_offer(p_offer,p_action)$function$
;
CREATE OR REPLACE FUNCTION public.create_trade_counter(p_offer uuid, p_cash numeric, p_direction text, p_note text)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.create_trade_counter(p_offer,p_cash,p_direction,p_note)$function$
;
CREATE OR REPLACE FUNCTION public.respond_trade_counter(p_counter uuid, p_accept boolean)
 RETURNS void
 LANGUAGE sql
 SET search_path TO ''
AS $function$select private.respond_trade_counter(p_counter,p_accept)$function$
;
alter table public.collector_messages add constraint release_text_only_attachments check(cardinality(attachment_ids)=0);
revoke update on public.collector_messages,public.trade_offers from authenticated;
do $$ declare c record;begin
 for c in select column_name from information_schema.columns where table_schema='public' and table_name='trade_offers' loop
 execute format('revoke update (%I) on public.trade_offers from authenticated',c.column_name);
 end loop;
end $$;
grant update(status) on public.trade_offers to authenticated;
grant update(read_at) on public.collector_messages to authenticated;
revoke insert,update,delete on public.price_offers,public.price_offer_history,public.trade_counteroffers from authenticated;
CREATE OR REPLACE FUNCTION private.notify_saved_listing_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.price is distinct from old.price and new.price < old.price and new.status = 'active' then
   insert into public.collector_notifications(user_id,actor_id,kind,source_id)
   select s.user_id,new.seller_id,'favorite_price_drop',new.id
   from public.saved_listings s
   where s.listing_id=new.id and s.user_id<>new.seller_id and not exists(select 1 from public.user_blocks b where (b.blocker_id=s.user_id and b.blocked_id=new.seller_id) or (b.blocker_id=new.seller_id and b.blocked_id=s.user_id)) on conflict(user_id,kind,source_id) do update set read_at=null,created_at=now();
 end if;
 if new.status='sold' and old.status is distinct from 'sold' then
   insert into public.collector_notifications(user_id,actor_id,kind,source_id)
   select s.user_id,new.seller_id,'favorite_sold',new.id
   from public.saved_listings s
   where s.listing_id=new.id and s.user_id<>new.seller_id and not exists(select 1 from public.user_blocks b where (b.blocker_id=s.user_id and b.blocked_id=new.seller_id) or (b.blocker_id=new.seller_id and b.blocked_id=s.user_id)) on conflict(user_id,kind,source_id) do update set read_at=null,created_at=now();
 end if;
 return new;
end;
$function$
;
revoke all on function private.notify_saved_listing_changes() from public,anon,authenticated;
create trigger notify_saved_listing_changes after update of price,status on public.listings for each row execute function private.notify_saved_listing_changes();
CREATE OR REPLACE FUNCTION private.listing_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if current_user in ('authenticated','anon') and old.status='reserved' then raise exception 'Reserved listing is locked'; end if;
 if tg_op='DELETE' then return old; end if;return new;
end $function$
;
create trigger guard_listing before delete or update on public.listings for each row execute function private.listing_guard();
-- Participants retain visibility of negotiated inventory after reservation.
create policy release_negotiated_listing_read on public.listings for select to authenticated using (
 exists(select 1 from public.price_offers o where o.listing_id=listings.id and auth.uid() in (o.buyer_id,o.seller_id)) or
 exists(select 1 from public.trade_offers t where (t.listing_id=listings.id or t.offered_listing_id=listings.id or listings.id=any(t.offered_listing_ids)) and auth.uid() in (t.sender_id,t.recipient_id)));
-- Isolated staging. No tracking SDKs, payments, extra grants or visitor analytics.
create function private.seller_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();inventory jsonb;price_replies bigint;trade_replies bigint;
begin
 if uid is null then raise exception 'Sign in to see your seller overview' using errcode='42501';end if;
 select jsonb_build_object('active',count(*) filter(where status='active'),'reserved',count(*) filter(where status='reserved'),'sold',count(*) filter(where status='sold'),'removed',count(*) filter(where status='removed'),'active_asking_total',coalesce(sum(price) filter(where status='active'),0)) into inventory from public.listings where seller_id=uid;
 select count(*) into price_replies from public.price_offers where seller_id=uid and status in('pending','countered') and last_actor_id is distinct from uid;
 select count(*) into trade_replies from public.trade_offers t where t.recipient_id=uid and t.status='pending' and (not exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=t.id and c.status='pending') or exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=t.id and c.status='pending' and c.recipient_id=uid));
 return inventory||jsonb_build_object('price_replies',price_replies,'trade_replies',trade_replies,'as_of',now());
end $$;
create function public.get_my_seller_overview() returns jsonb language sql stable security invoker set search_path='' as $$select private.seller_overview()$$;
revoke all on function private.seller_overview(),public.get_my_seller_overview() from public,anon;
grant execute on function private.seller_overview(),public.get_my_seller_overview() to authenticated;
notify pgrst,'reload schema';
-- Strengthen all existing moderator entry points without rewriting moderator grants.
create or replace function public.is_deckplay_moderator() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and auth.jwt()->>'aal'='aal2'
 and exists(select 1 from public.moderator_roles where user_id=auth.uid() and role in ('owner','moderator'))
 and exists(select 1 from auth.sessions s join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
 where s.user_id=auth.uid() and s.id::text=auth.jwt()->>'session_id' and s.aal='aal2'
 and (s.not_after is null or s.not_after>now()) and f.status='verified');
$$;
create function public.review_deckplay_report(p_report_id uuid,p_status text,p_reason text,p_expected_status text) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.is_deckplay_moderator() then raise exception 'Moderator access with active MFA required' using errcode='42501';end if;
 if p_status is null or p_status not in ('open','reviewing','resolved') or p_expected_status is null or p_expected_status not in ('open','reviewing','resolved') or p_reason is null or length(btrim(p_reason)) not between 8 and 1000 then raise exception 'Valid status and reason required' using errcode='22023';end if;
 select status into previous from public.user_reports where id=p_report_id for update;
 if not found then raise exception 'Report unavailable' using errcode='P0002';end if;
 if previous<>p_expected_status then raise exception 'Report changed; reload' using errcode='40001';end if;
 if previous=p_status then return;end if;
 update public.user_reports set status=p_status where id=p_report_id;
 insert into public.moderation_actions(moderator_id,report_id,action,notes) values(auth.uid(),p_report_id,'report_'||p_status,btrim(p_reason));
end $$;
alter policy "submit reports" on public.user_reports with check(reporter_id=(select auth.uid()) and status='open');
revoke all on function private.trade_inventory_ids(public.trade_offers) from public,anon,authenticated;
revoke all on function private.trade_listing_snapshot(public.listings) from public,anon,authenticated;
revoke all on function private.trade_guard() from public,anon,authenticated;
revoke all on function private.listing_guard() from public,anon,authenticated;
revoke all on function public.submit_price_offer(uuid,numeric) from public,anon;
grant execute on function public.submit_price_offer(uuid,numeric) to authenticated;
revoke all on function private.submit_price_offer(uuid,numeric) from public,anon;
grant execute on function private.submit_price_offer(uuid,numeric) to authenticated;
revoke all on function public.respond_price_offer(uuid,text,numeric) from public,anon;
grant execute on function public.respond_price_offer(uuid,text,numeric) to authenticated;
revoke all on function private.respond_price_offer(uuid,text,numeric) from public,anon;
grant execute on function private.respond_price_offer(uuid,text,numeric) to authenticated;
revoke all on function public.respond_trade_offer(uuid,text) from public,anon;
grant execute on function public.respond_trade_offer(uuid,text) to authenticated;
revoke all on function private.respond_trade_offer(uuid,text) from public,anon;
grant execute on function private.respond_trade_offer(uuid,text) to authenticated;
revoke all on function public.create_trade_counter(uuid,numeric,text,text) from public,anon;
grant execute on function public.create_trade_counter(uuid,numeric,text,text) to authenticated;
revoke all on function private.create_trade_counter(uuid,numeric,text,text) from public,anon;
grant execute on function private.create_trade_counter(uuid,numeric,text,text) to authenticated;
revoke all on function public.respond_trade_counter(uuid,boolean) from public,anon;
grant execute on function public.respond_trade_counter(uuid,boolean) to authenticated;
revoke all on function private.respond_trade_counter(uuid,boolean) from public,anon;
grant execute on function private.respond_trade_counter(uuid,boolean) to authenticated;
revoke all on function public.review_deckplay_report(uuid,text,text,text),public.is_deckplay_moderator() from public,anon;
grant execute on function public.review_deckplay_report(uuid,text,text,text),public.is_deckplay_moderator() to authenticated;
notify pgrst,'reload schema';
commit;
