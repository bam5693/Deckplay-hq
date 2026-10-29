-- STAGING ONLY, prrrzeelltmyugssqnzk. No production migration.
begin;
-- Route responses through a function to acquire listing locks before offer locks.
revoke update(status) on public.trade_offers from authenticated;
create or replace function private.respond_trade_offer(p_offer uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare t public.trade_offers; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') and p_action='accepted' then raise exception 'Respond to the pending counteroffer first';end if;
 update public.trade_offers set status=p_action,updated_at=now() where id=t.id;
 if p_action='accepted' then
 update public.price_offers set status='declined',updated_at=now() where listing_id in(t.listing_id,t.offered_listing_id) and status in('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where id<>t.id and (listing_id in(t.listing_id,t.offered_listing_id) or offered_listing_id in(t.listing_id,t.offered_listing_id)) and status='pending';
 end if;
end $$;
create or replace function private.create_trade_counter(p_offer uuid,p_cash numeric,p_direction text,p_note text) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.trade_offers; uid uuid:=auth.uid(); cid uuid;
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into t from public.trade_offers where id=p_offer and uid in (sender_id,recipient_id);
 if not found then raise exception 'Trade unavailable';end if;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=p_offer for update;
 if t.status<>'pending' or exists(select 1 from public.listings where id in(t.listing_id,t.offered_listing_id) and status<>'active') then raise exception 'Trade is closed';end if;
 if exists(select 1 from public.trade_counteroffers where trade_offer_id=t.id and status='pending') then raise exception 'A counteroffer is already pending';end if;
 if uid<>t.recipient_id then raise exception 'Only recipient can counter the original offer';end if;
 if p_cash is null or p_cash<0 or p_cash>100000 or p_direction not in('none','sender_pays','recipient_pays') or (p_direction='none' and p_cash<>0) or (p_direction<>'none' and p_cash<=0) or length(coalesce(p_note,''))>2000 then raise exception 'Invalid counteroffer terms';end if;
 insert into public.trade_counteroffers(trade_offer_id,proposer_id,recipient_id,cash_amount,cash_direction,offer_note) values(t.id,uid,t.sender_id,p_cash,p_direction,coalesce(p_note,'')) returning id into cid;
 perform private.notify(t.sender_id,uid,'counteroffer',cid);return cid;
end $$;
create or replace function private.respond_trade_counter(p_counter uuid,p_accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare c public.trade_counteroffers; t public.trade_offers; uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required';end if;
 select * into c from public.trade_counteroffers where id=p_counter and recipient_id=uid;
 if not found then raise exception 'Counteroffer unavailable';end if;
 select * into t from public.trade_offers where id=c.trade_offer_id;
 perform 1 from public.listings where id in (t.listing_id,t.offered_listing_id) order by id for update;
 select * into t from public.trade_offers where id=c.trade_offer_id for update;
 select * into c from public.trade_counteroffers where id=p_counter for update;
 if c.status<>'pending' or t.status<>'pending' then raise exception 'Counteroffer is closed';end if;
 update public.trade_counteroffers set status=case when p_accept then 'accepted' else 'declined' end where id=c.id;
 if p_accept then
 -- Trigger verifies that the accepting actor is recipient of this accepted counter.
 update public.trade_offers set status='accepted',cash_amount=c.cash_amount,cash_direction=c.cash_direction,offer_note=c.offer_note,updated_at=now() where id=t.id;
 update public.price_offers set status='declined',updated_at=now() where listing_id in(t.listing_id,t.offered_listing_id) and status in('pending','countered');
 update public.trade_offers set status='declined',updated_at=now() where id<>t.id and (listing_id in(t.listing_id,t.offered_listing_id) or offered_listing_id in(t.listing_id,t.offered_listing_id)) and status='pending';
 end if;
 perform private.notify(c.proposer_id,uid,'trade_update',t.id);
end $$;
create or replace function public.respond_trade_offer(p_offer uuid,p_action text) returns void language sql security invoker set search_path='' as $$select private.respond_trade_offer(p_offer,p_action)$$;
create or replace function public.create_trade_counter(p_offer uuid,p_cash numeric,p_direction text,p_note text) returns uuid language sql security invoker set search_path='' as $$select private.create_trade_counter(p_offer,p_cash,p_direction,p_note)$$;
create or replace function public.respond_trade_counter(p_counter uuid,p_accept boolean) returns void language sql security invoker set search_path='' as $$select private.respond_trade_counter(p_counter,p_accept)$$;
revoke all on function private.respond_trade_offer(uuid,text),private.create_trade_counter(uuid,numeric,text,text),private.respond_trade_counter(uuid,boolean),public.respond_trade_offer(uuid,text),public.create_trade_counter(uuid,numeric,text,text),public.respond_trade_counter(uuid,boolean) from public,anon;
grant execute on function private.respond_trade_offer(uuid,text),private.create_trade_counter(uuid,numeric,text,text),private.respond_trade_counter(uuid,boolean),public.respond_trade_offer(uuid,text),public.create_trade_counter(uuid,numeric,text,text),public.respond_trade_counter(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
