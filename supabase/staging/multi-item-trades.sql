-- Isolated staging: prrrzeelltmyugssqnzk. Additive inventory support; no commerce.
alter table public.trade_offers add column offered_listing_ids uuid[] not null default '{}';
alter table public.trade_offers add column item_snapshots jsonb not null default '[]';
alter table public.trade_offers add column initial_terms jsonb not null default '{}';
create index trade_offers_additional_inventory on public.trade_offers using gin(offered_listing_ids) where status='pending';

create function private.trade_inventory_ids(t public.trade_offers) returns uuid[]
language sql immutable set search_path='' as $$
 select coalesce(array_agg(distinct id order by id),'{}'::uuid[]) from unnest(array[t.listing_id,t.offered_listing_id]||t.offered_listing_ids) id where id is not null
$$;
create function private.trade_listing_snapshot(l public.listings) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('listing_id',l.id,'owner_id',l.seller_id,'title',l.title,'description',l.description,'condition',l.condition,'category',l.category,'image_urls',l.image_urls,'asking_price',l.price)
$$;
revoke all on function private.trade_inventory_ids(public.trade_offers),private.trade_listing_snapshot(public.listings) from public,anon,authenticated;

create or replace function private.trade_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare l public.listings; uid uuid:=auth.uid(); ids uuid[]; snap jsonb; saved public.listings;
begin
 if tg_op='UPDATE' then
  if row(new.sender_id,new.recipient_id,new.listing_id,new.offered_listing_id,new.offered_listing_ids,new.item_snapshots,new.initial_terms) is distinct from row(old.sender_id,old.recipient_id,old.listing_id,old.offered_listing_id,old.offered_listing_ids,old.item_snapshots,old.initial_terms) then raise exception 'Trade inventory is fixed. Send a new proposal to change items';end if;
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
  if length(trim(coalesce(new.offer_note,'')))=0 or length(new.offer_note)>2000 or new.cash_amount is null or new.cash_amount<0 or new.cash_amount>100000 or new.cash_direction is null or new.cash_direction not in ('none','sender_pays','recipient_pays') or (new.cash_direction='none' and new.cash_amount<>0) or (new.cash_direction<>'none' and new.cash_amount<=0) then raise exception 'Invalid trade terms';end if;
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
end $$;

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
 if p_cash is null or p_cash<0 or p_cash>100000 or p_direction not in('none','sender_pays','recipient_pays') or (p_direction='none' and p_cash<>0) or (p_direction<>'none' and p_cash<=0) or length(coalesce(p_note,''))>2000 then raise exception 'Invalid counteroffer terms';end if;
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
notify pgrst,'reload schema';

