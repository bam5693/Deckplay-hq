-- Staging-first: preserve original trade terms on any status transition.
-- The only legal cash/note rewrite is acceptance of a counteroffer that the
-- original sender already accepted through respond_trade_counter().
-- This trigger runs before the existing guard_trade trigger.
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

drop trigger if exists a_trade_terms_immutable on public.trade_offers;
create trigger a_trade_terms_immutable
before update on public.trade_offers
for each row execute function private.guard_trade_terms_immutable();
