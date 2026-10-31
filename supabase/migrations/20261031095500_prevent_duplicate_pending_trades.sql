-- ISOLATED STAGING ONLY. Guard against same-terms trade proposals sent under
-- different request IDs (e.g. double tap, stale tab). No production deployment.
-- A repeat of the SAME id still uses the existing primary-key recovery path.
CREATE INDEX IF NOT EXISTS trade_offers_pending_sender_listing_idx
 ON public.trade_offers (listing_id,sender_id) WHERE status='pending';

CREATE OR REPLACE FUNCTION private.trade_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  -- The inventory FOR UPDATE locks above serialize simultaneous proposals.
  -- Keep same-ID retry behavior (the primary key handles it); reject only
  -- different IDs for identical live terms without double notifying the seller.
  if exists(
    select 1 from public.trade_offers t
    where t.id<>new.id and t.listing_id=new.listing_id
      and t.sender_id=new.sender_id and t.recipient_id=new.recipient_id
      and t.status='pending'
      and t.offered_listing_ids is not distinct from new.offered_listing_ids
      and t.cash_amount is not distinct from new.cash_amount
      and t.cash_direction is not distinct from new.cash_direction
      and t.offer_note is not distinct from new.offer_note
  ) then
    raise exception 'An identical pending trade proposal already exists. Review your existing trade first';
  end if;
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
end $function$;
