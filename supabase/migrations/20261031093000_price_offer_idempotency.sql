-- STAGING ONLY. Reuse same buyer/listing open price offer after a connection retry.
-- A changed amount must use the existing negotiation; new submissions can resume
-- only after the previous offer is withdrawn or declined.
-- No production deployment approved.
CREATE UNIQUE INDEX IF NOT EXISTS price_offers_one_open_per_buyer_listing_idx
  ON public.price_offers(listing_id,buyer_id)
  WHERE status IN ('pending','countered');

CREATE OR REPLACE FUNCTION private.submit_price_offer(p_listing_id uuid, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare l public.listings; existing public.price_offers; oid uuid; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required'; end if;
 select * into l from public.listings where id=p_listing_id for update;
 if not found or l.status<>'active' or not l.accepts_price_offers then raise exception 'Listing is not available for offers'; end if;
 if uid=l.seller_id then raise exception 'Cannot offer on your own listing'; end if;
 if p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>trunc(p_amount,2) then raise exception 'Invalid offer amount'; end if;
 if exists(select 1 from public.user_blocks where (blocker_id=uid and blocked_id=l.seller_id) or (blocker_id=l.seller_id and blocked_id=uid)) then raise exception 'Offer unavailable'; end if;
 -- Existing open negotiation is the idempotency key for retries from this buyer.
 -- The listing FOR UPDATE lock above serializes simultaneous submissions.
 select * into existing from public.price_offers
 where listing_id=l.id and buyer_id=uid and status in ('pending','countered')
 order by created_at desc,id desc limit 1;
 if found then
  if existing.status='pending' and existing.amount=p_amount then
   return existing.id; -- No duplicate history event or seller notification.
  end if;
  raise exception 'An open offer already exists for this listing. Reply to it before submitting another.' using errcode='P0001';
 end if;
 insert into public.price_offers(listing_id,buyer_id,seller_id,amount,last_actor_id,status) values(l.id,uid,l.seller_id,p_amount,uid,'pending') returning id into oid;
 insert into public.price_offer_history(offer_id,listing_id,buyer_id,seller_id,actor_id,action,amount) values(oid,l.id,uid,l.seller_id,uid,'submitted',p_amount);
 perform private.notify(l.seller_id,uid,'price_offer',oid);return oid;
end $function$;
