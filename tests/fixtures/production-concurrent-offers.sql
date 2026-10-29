-- Dedicated race fixtures in the disposable database only.
insert into auth.users(id,email,raw_user_meta_data) values
('71000000-0000-4000-8000-000000000001','race-seller@deckplay.test','{}'),
('71000000-0000-4000-8000-000000000002','race-buyer@deckplay.test','{}'),
('71000000-0000-4000-8000-000000000003','race-trader@deckplay.test','{}');
insert into public.listings(id,seller_id,title,price,category,condition,accepts_trades,accepts_price_offers) values
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','TEST race target',25,'video_games','used',true,true),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','TEST race collateral',20,'collectibles','used',true,true);
insert into public.price_offers(id,listing_id,buyer_id,seller_id,amount,last_actor_id) values
('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',20,'71000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}',false);
insert into public.trade_offers(id,listing_id,sender_id,recipient_id,offered_listing_id,offered_listing_ids,offer_note) values
('74000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002',array['72000000-0000-4000-8000-000000000002']::uuid[],'TEST race proposal');
