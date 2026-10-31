-- ISOLATED STAGING ONLY: reject fractional-cent price amounts at the authoritative RPC boundary.
-- Replaces existing private definer functions without broadening grants or data access.
-- Real public migration requires separate production recovery and release approval.

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
 if p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>trunc(p_amount,2) then raise exception 'Invalid counteroffer amount'; end if;
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
end $function$;

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
 if p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>trunc(p_amount,2) then raise exception 'Invalid offer amount'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=l.seller_id) or (blocker_id=l.seller_id and blocked_id=uid)) then raise exception 'Offer unavailable'; end if;
 insert into public.price_offers(listing_id,buyer_id,seller_id,amount,last_actor_id,status) values(l.id,uid,l.seller_id,p_amount,uid,'pending') returning id into oid;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount) values(oid,l.id,uid,l.seller_id,uid,'submitted',p_amount);
 perform private.notify(l.seller_id,uid,'price_offer',oid);return oid;
end $function$;
