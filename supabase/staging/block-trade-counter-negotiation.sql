-- STAGING ONLY: prrrzeelltmyugssqnzk. Prevent new trade counters after either party blocks the other.
-- Preserve existing role grants and response-time trade_guard checks.
create or replace function private.create_trade_counter(p_offer uuid,p_cash numeric,p_direction text,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.trade_offers; uid uuid:=auth.uid(); cid uuid;
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' or exists(select 1 from public.listings where id in(t.listing_id,t.offered_listing_id) and status<>'active') then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.user_blocks where (blocker_id=t.sender_id and blocked_id=t.recipient_id) or (blocker_id=t.recipient_id and blocked_id=t.sender_id)) then raise exception 'Trade unavailable between these collectors';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') then raise exception 'A counteroffer is already pending';end if;
 if uid<>t.recipient_id then raise exception 'Only recipient can counter the original offer';end if;
 if p_cash is null or p_cash<0 or p_cash>100000 or p_direction not in('none','sender_pays','recipient_pays') or (p_direction='none' and p_cash<>0) or (p_direction<>'none' and p_cash<=0) or length(coalesce(p_note,''))>2000 then raise exception 'Invalid counteroffer terms';end if;
 insert into public.trade_counteroffers(trade_offer_id,proposer_id,recipient_id,cash_amount,cash_direction,offer_note) values(t.id,uid,t.sender_id,p_cash,p_direction,coalesce(p_note,'')) returning id into cid;
 perform private.notify(t.sender_id,uid,'counteroffer',cid);return cid;
end $$;
