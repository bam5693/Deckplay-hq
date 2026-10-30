-- STAGING ONLY; single transaction, always rolled back on success.
-- Uses existing dedicated synthetic identities and admin-side JWT claim simulation
-- to exercise the privileged trigger path. Direct REST UPDATE is already denied
-- by authenticated table privileges and is tested separately.
begin;
select pg_catalog.set_config('deckplay.fixture.seller',(select id::text from auth.users where email='deckplay-seller@deckplay.test'),true);
select pg_catalog.set_config('deckplay.fixture.buyer',(select id::text from auth.users where email='deckplay-buyer@deckplay.test'),true);
select pg_catalog.set_config('request.jwt.claim.sub',current_setting('deckplay.fixture.seller'),true);
with inserted as (
 insert into public.listings(seller_id,title,price,category,condition,image_urls,accepts_trades,accepts_price_offers,tcg_game)
 values(auth.uid(),'TEST ONLY BOT rollback trade guard seller',25,'trading_cards','like_new',
 array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],
 true,true,'sports_cards') returning id
) select pg_catalog.set_config('deckplay.fixture.target',id::text,true) from inserted;
select pg_catalog.set_config('request.jwt.claim.sub',current_setting('deckplay.fixture.buyer'),true);
with inserted as (
 insert into public.listings(seller_id,title,price,category,condition,image_urls,accepts_trades,accepts_price_offers,tcg_game)
 values(auth.uid(),'TEST ONLY BOT rollback trade guard buyer',25,'trading_cards','like_new',
 array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],
 true,true,'one_piece') returning id
) select pg_catalog.set_config('deckplay.fixture.offered',id::text,true) from inserted;
with inserted as (
 insert into public.trade_offers(listing_id,offered_listing_id,sender_id,recipient_id,offer_note,cash_amount,cash_direction)
 values(current_setting('deckplay.fixture.target')::uuid,
        current_setting('deckplay.fixture.offered')::uuid,
        auth.uid(),current_setting('deckplay.fixture.seller')::uuid,
        'TEST ONLY original cash terms',0,'none') returning id
) select pg_catalog.set_config('deckplay.fixture.trade',id::text,true) from inserted;
select pg_catalog.set_config('request.jwt.claim.sub',current_setting('deckplay.fixture.seller'),true);
do $verify_rejection$
declare rejection text := null;
begin
 begin
  update public.trade_offers
  set status='accepted',cash_amount=500,cash_direction='sender_pays',offer_note='TEST ONLY injected amount'
  where id=current_setting('deckplay.fixture.trade')::uuid;
 exception when others then get stacked diagnostics rejection = message_text;
 end;
 if rejection is distinct from 'Trade terms can change only through an accepted counteroffer' then raise exception 'Unexpected rejection type for cash tampering: %',coalesce(rejection,'none'); end if;
 if not exists (select 1 from public.trade_offers
                where id=current_setting('deckplay.fixture.trade')::uuid
                and status='pending' and cash_amount=0 and cash_direction='none'
                and offer_note='TEST ONLY original cash terms') then
  raise exception 'P0 FAILURE: tampered original trade was not preserved';
 end if;
end
$verify_rejection$;
with counter as (
 select public.create_trade_counter(current_setting('deckplay.fixture.trade')::uuid,
        5,'sender_pays','TEST ONLY approved counter') as id
) select pg_catalog.set_config('deckplay.fixture.counter',id::text,true) from counter;
do $verify_pending_counter$
declare rejection text := null;
begin
 begin
  update public.trade_offers set status='accepted'
  where id=current_setting('deckplay.fixture.trade')::uuid;
 exception when others then get stacked diagnostics rejection = message_text;
 end;
 if rejection is distinct from 'Respond to the pending trade counteroffer first' then
  raise exception 'Unexpected rejection type for pending counter: %',coalesce(rejection,'none');
 end if;
 if not exists (select 1 from public.trade_offers where id=current_setting('deckplay.fixture.trade')::uuid and status='pending') then
  raise exception 'P0 FAILURE: stale original trade did not remain pending';
 end if;
end
$verify_pending_counter$;
select pg_catalog.set_config('request.jwt.claim.sub',current_setting('deckplay.fixture.buyer'),true);
select public.respond_trade_counter(current_setting('deckplay.fixture.counter')::uuid,true);
do $verify_acceptance$
begin
 if not exists (
  select 1 from public.trade_offers where id=current_setting('deckplay.fixture.trade')::uuid
  and status='accepted' and cash_amount=5 and cash_direction='sender_pays'
  and offer_note='TEST ONLY approved counter' and initial_terms->>'note'='TEST ONLY original cash terms'
 ) then raise exception 'P0 FAILURE: approved trade counter could not settle with original terms retained'; end if;
 if (select count(*) from public.listings
     where id in (current_setting('deckplay.fixture.target')::uuid,current_setting('deckplay.fixture.offered')::uuid)
       and status='reserved')<>2 then
  raise exception 'P0 FAILURE: approved counter did not reserve both synthetic items'; end if;
end
$verify_acceptance$;
rollback;
select 'PASS: privileged trigger rejects term changes and pending-counter bypass; legitimate counter accepted; fixtures rolled back' as result;
