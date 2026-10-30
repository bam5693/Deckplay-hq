-- Staging-first: prevent direct acceptance bypassing a pending counter.
create or replace function private.guard_trade_terms_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(new.id,new.sender_id,new.recipient_id,new.listing_id,
         new.offered_listing_id,new.offered_listing_ids,new.item_snapshots,
         new.initial_terms,new.created_at)
     is distinct from
     row(old.id,old.sender_id,old.recipient_id,old.listing_id,
         old.offered_listing_id,old.offered_listing_ids,old.item_snapshots,
         old.initial_terms,old.created_at)
  then
    raise exception 'Trade identity and inventory cannot change';
  end if;

  -- Direct table PATCH must not bypass the pending-counter check inside
  -- respond_trade_offer(). An approved counter transition updates the counter
  -- to accepted first, so it remains valid.
  if old.status = 'pending' and new.status = 'accepted'
     and exists (select 1 from public.trade_counteroffers c
                 where c.trade_offer_id = old.id and c.status = 'pending')
  then
    raise exception 'Respond to the pending trade counteroffer first';
  end if;

  if row(new.offer_note,new.cash_amount,new.cash_direction)
     is distinct from row(old.offer_note,old.cash_amount,old.cash_direction)
  then
    if not (
      old.status = 'pending' and new.status = 'accepted'
      and exists (
        select 1 from public.trade_counteroffers c
        where c.trade_offer_id = old.id
          and c.status = 'accepted'
          and c.recipient_id = auth.uid()
          and c.cash_amount is not distinct from new.cash_amount
          and c.cash_direction is not distinct from new.cash_direction
          and c.offer_note is not distinct from new.offer_note
      )
    ) then
      raise exception 'Trade terms can change only through an accepted counteroffer';
    end if;
  end if;
  return new;
end;
$$;
