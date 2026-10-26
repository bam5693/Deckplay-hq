-- STAGING ONLY: never apply to production. Only the two disposable bot accounts qualify.
begin;
create or replace function private.cleanup_staging_fixture(p_marker text)
returns void language plpgsql security definer set search_path='' as $$
declare bots uuid[]; lids uuid[]; offers uuid[]; trades uuid[]; messages uuid[];
begin
 select array_agg(id) into bots from auth.users where email in ('deckplay-seller@deckplay.test','deckplay-buyer@deckplay.test');
 if coalesce(cardinality(bots),0)<>2 or auth.uid() is null or not(auth.uid()=any(bots)) then raise exception 'Dedicated staging bot required'; end if;
 if p_marker is null or p_marker !~ '^TEST ONLY BOT [a-f0-9-]{36}$' then raise exception 'Exact fixture marker required'; end if;
 select coalesce(array_agg(id),'{}') into lids from public.listings where title=p_marker and seller_id=any(bots);
 select coalesce(array_agg(id),'{}') into offers from public.price_offers where listing_id=any(lids);
 select coalesce(array_agg(id),'{}') into trades from public.trade_offers where listing_id=any(lids) or offered_listing_id=any(lids);
 select coalesce(array_agg(id),'{}') into messages from public.collector_messages where body=p_marker and sender_id=any(bots) and recipient_id=any(bots);
 if exists(select 1 from public.price_offers where id=any(offers) and (not(buyer_id=any(bots)) or not(seller_id=any(bots))))
 or exists(select 1 from public.trade_offers where id=any(trades) and (not(sender_id=any(bots)) or not(recipient_id=any(bots))))
 or exists(select 1 from public.collector_messages where listing_id=any(lids) and (not(sender_id=any(bots)) or not(recipient_id=any(bots))))
 or exists(select 1 from public.saved_listings where listing_id=any(lids) and not(user_id=any(bots))) then raise exception 'Fixture has external participants'; end if;
 delete from public.collector_notifications where user_id=any(bots) and source_id=any(offers||trades||messages||(select coalesce(array_agg(id),'{}') from public.trade_counteroffers where trade_offer_id=any(trades)));
 delete from public.seller_reviews where deal_id in(select id from public.deal_progress where offer_id=any(offers||trades));
 delete from public.deal_progress where offer_id=any(offers||trades) and buyer_id=any(bots) and seller_id=any(bots);
 delete from public.trade_counteroffers where trade_offer_id=any(trades);
 delete from public.trade_offers where id=any(trades);
 delete from public.price_offer_history where offer_id=any(offers);
 delete from public.price_offers where id=any(offers);
 delete from public.saved_listings where listing_id=any(lids);
 delete from public.collector_messages where id=any(messages) or listing_id=any(lids);
 delete from public.user_reports where reporter_id=any(bots) and (listing_id=any(lids) or details=p_marker);
 delete from public.orders where listing_id=any(lids) and buyer_id=any(bots) and seller_id=any(bots);
 delete from public.trade_items where listing_id=any(lids) and offered_by=any(bots);
 delete from public.listings where id=any(lids);
 delete from public.wanted_posts where title=p_marker and user_id=any(bots);
end $$;
revoke all on function private.cleanup_staging_fixture(text) from public,anon,authenticated;
grant execute on function private.cleanup_staging_fixture(text) to authenticated;
create or replace function public.cleanup_staging_fixture(p_marker text) returns void language sql security invoker set search_path='' as $$select private.cleanup_staging_fixture(p_marker)$$;
revoke all on function public.cleanup_staging_fixture(text) from public,anon;
grant execute on function public.cleanup_staging_fixture(text) to authenticated;
commit;
