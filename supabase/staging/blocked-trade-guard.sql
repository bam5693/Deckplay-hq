-- STAGING ONLY (prrrzeelltmyugssqnzk): prevent new trade offers across a block.
-- Keep this idempotent so a fresh staging environment can reproduce the guard.
begin;
create or replace function private.trade_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare l public.listings; offered public.listings; uid uuid:=auth.uid();
begin
 -- Internal competing-offer closure is performed only by validated privileged routines.
 if tg_op='UPDATE' and new.status='declined' and old.status='pending' and exists(select 1 from public.listings reserved_listing where reserved_listing.id in (old.listing_id,old.offered_listing_id) and reserved_listing.status='reserved') then return new; end if;
 if uid is null then raise exception 'Sign in required'; end if;
 -- Lock both item rows in stable UUID order to avoid double reservation and lock inversion.
 perform 1 from public.listings where id in (new.listing_id,new.offered_listing_id) order by id for update;
 select * into l from public.listings where id=new.listing_id;
 if l.id is null or l.status<>'active' then raise exception 'Listing is not available'; end if;
 if new.sender_id=new.recipient_id or new.recipient_id<>l.seller_id then raise exception 'Invalid trade participants'; end if;
 if new.offered_listing_id is not null then
 select * into offered from public.listings where id=new.offered_listing_id;
 if offered.id is null or offered.seller_id<>new.sender_id or offered.status<>'active' then raise exception 'Offered item unavailable'; end if;
 end if;
 if tg_op='INSERT' then
 if exists(select 1 from public.user_blocks where (blocker_id=new.sender_id and blocked_id=new.recipient_id) or (blocker_id=new.recipient_id and blocked_id=new.sender_id)) then raise exception 'Trade unavailable between these collectors'; end if;
 if uid<>new.sender_id or new.status<>'pending' or not l.accepts_trades then raise exception 'Trade unavailable'; end if;
 if length(trim(new.offer_note))=0 or new.cash_amount<0 or new.cash_amount>100000 or new.cash_direction not in ('none','sender_pays','recipient_pays') then raise exception 'Invalid trade terms'; end if;
 perform private.notify(new.recipient_id,uid,'trade_offer',new.id);
 else
 if old.status<>'pending' then raise exception 'Trade is closed'; end if;
 if new.status='cancelled' then
 if uid<>old.sender_id then raise exception 'Only sender can cancel'; end if;
 elsif new.status in ('accepted','declined') then
 if uid<>old.recipient_id and not (new.status='accepted' and exists(select 1 from public.trade_counteroffers c where c.trade_offer_id=old.id and c.recipient_id=uid and c.status='accepted')) then raise exception 'Only recipient can respond'; end if;
 else raise exception 'Invalid trade action'; end if;
 if new.status='accepted' then
 update public.listings set status='reserved',updated_at=now() where id in (new.listing_id,new.offered_listing_id);
 end if;
 perform private.notify(case when uid=new.sender_id then new.recipient_id else new.sender_id end,uid,'trade_update',new.id);
 end if;
 return new;
end $$;
commit;
