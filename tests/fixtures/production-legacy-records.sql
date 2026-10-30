-- Synthetic records created BEFORE migration; never run against a hosted project.
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','legacy-seller@deckplay.test','{}'),
 ('10000000-0000-4000-8000-000000000002','legacy-buyer@deckplay.test','{}'),
 ('10000000-0000-4000-8000-000000000003','legacy-outsider@deckplay.test','{}');
update public.profiles set display_name=null,username='legacy_owner' where id='10000000-0000-4000-8000-000000000001';
insert into public.listings(id,seller_id,title,description,category,condition,price,image_urls,accepts_trades,accepts_price_offers) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Legacy saved item','Preserve exact production-shaped contents','video_games','used',25,'{}',true,true),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Legacy offered item','Legacy trade collateral','collectibles','used',20,'{}',true,true);
insert into public.saved_listings(user_id,listing_id) values('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',false);
insert into public.trade_offers(id,listing_id,sender_id,recipient_id,offered_listing_id,offer_note)
values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Legacy terms');
select public.submit_price_offer('20000000-0000-4000-8000-000000000001',15);
insert into public.collector_messages(sender_id,recipient_id,body) values('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Legacy message preserved');
create function private.rehearsal_fingerprint() returns jsonb language sql as $$
select jsonb_build_object(
'profiles',(select jsonb_agg(to_jsonb(p)-'collection_links'-'collection_inquiry_mode' order by id) from public.profiles p),
'listings',(select jsonb_agg(to_jsonb(l) order by id) from public.listings l),
'favorites',(select jsonb_agg(to_jsonb(s) order by user_id,listing_id) from public.saved_listings s),
'messages',(select jsonb_agg(to_jsonb(m)-'attachment_ids' order by id) from public.collector_messages m),
'price_offers',(select jsonb_agg(to_jsonb(o) order by id) from public.price_offers o),
'history',(select jsonb_agg(to_jsonb(h) order by id) from public.price_offer_history h),
'notifications',(select jsonb_agg(to_jsonb(n) order by id) from public.collector_notifications n),
'legacy_trades',(select jsonb_agg(to_jsonb(t)-'offered_listing_ids'-'item_snapshots'-'initial_terms' order by id) from public.trade_offers t))
$$;
create table private.rehearsal_canary(fingerprint jsonb not null);
insert into private.rehearsal_canary select private.rehearsal_fingerprint();
