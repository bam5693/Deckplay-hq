-- Isolated staging only. Every synthetic account, listing and deal rolls back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); target uuid:=gen_random_uuid(); e1 uuid:=gen_random_uuid();e2 uuid:=gen_random_uuid();e3 uuid:=gen_random_uuid();other uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'trade-bundle-rollback-'||a||'@deckplay.test','{}'),(b,'trade-bundle-rollback-'||b||'@deckplay.test','{}'),(c,'trade-bundle-rollback-'||c||'@deckplay.test','{}');
 insert into public.listings(id,seller_id,title,description,price,category,condition,image_urls,accepts_trades,accepts_price_offers) values
 (target,b,'TEST ONLY BUNDLE target','Sports PSA 9',100,'trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),
 (e1,a,'TEST ONLY BUNDLE foil','Japanese foil',20,'trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),
 (e2,a,'TEST ONLY BUNDLE promo','Stamped promo',30,'trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),
 (e3,a,'TEST ONLY BUNDLE game','Complete game',40,'video_games','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),
 (other,c,'TEST ONLY BUNDLE outsider','Third collector inventory',20,'trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true);
 perform set_config('deckplay.bundle.fixture',jsonb_build_object('a',a,'b',b,'c',c,'target',target,'e1',e1,'e2',e2,'e3',e3,'other',other)::text,true);
end $$;
set local role authenticated;
do $$
declare f jsonb:=current_setting('deckplay.bundle.fixture')::jsonb; a uuid:=(f->>'a')::uuid;b uuid:=(f->>'b')::uuid;c uuid:=(f->>'c')::uuid;target uuid:=(f->>'target')::uuid;e1 uuid:=(f->>'e1')::uuid;e2 uuid:=(f->>'e2')::uuid;e3 uuid:=(f->>'e3')::uuid;other uuid:=(f->>'other')::uuid;t uuid; competing uuid;counter uuid;price_offer uuid;rejected boolean;snaps jsonb;
begin
 -- Case 1: real-role insertion, private immutable snapshots, all-item acceptance and extra-only competing closure.
 begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
  insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_id,offer_note) values(e3,c,a,other,'Third collector competing on extra item') returning id into competing;
  price_offer:=public.submit_price_offer(e2,10);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,item_snapshots,offer_note) values(target,a,b,array[e1,e2,e3],'[{"title":"Forged snapshot"}]','Three items for the graded sports card') returning id,item_snapshots into t,snaps;
  if jsonb_array_length(snaps)<>4 or snaps::text like '%Forged snapshot%' then raise exception 'Server did not capture exact inventory';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);
  if exists(select 1 from public.trade_offers where id=t) then raise exception 'Outsider read private proposal snapshots';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  perform public.respond_trade_offer(t,'accepted');
  if (select status from public.listings where id=target)<>'reserved' then raise exception 'Requested item not reserved';end if;
  rejected:=false;begin perform public.respond_trade_offer(t,'accepted');exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Repeated acceptance succeeded';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  if (select count(*) from public.listings where id=any(array[e1,e2,e3]) and status='reserved')<>3 then raise exception 'Acceptance missed offered collateral';end if;
  if (select status from public.trade_offers where id=competing)<>'declined' or (select status from public.price_offers where id=price_offer)<>'declined' then raise exception 'Extra-only competing offers stayed pending';end if;
  raise exception using errcode='P9001',message='rollback completed case';
 exception when sqlstate 'P9001' then null;end;
 -- Case 2: cash counteroffer atomically reserves all items.
 begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[e1,e2,e3],'Three item bundle') returning id into t;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  counter:=public.create_trade_counter(t,10,'sender_pays','Same three items plus ten dollars');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform public.respond_trade_counter(counter,true);
  if (select count(*) from public.listings where id=any(array[e1,e2,e3]) and status='reserved')<>3 then raise exception 'Counter acceptance missed collateral';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);if (select status from public.listings where id=target)<>'reserved' then raise exception 'Counter missed requested item';end if;
  if (select cash_amount from public.trade_offers where id=t)<>10 then raise exception 'Agreed cash terms lost';end if;
  raise exception using errcode='P9001',message='rollback completed case';
 exception when sqlstate 'P9001' then null;end;
 -- Case 3: edited condition disclosure invalidates a pending counter without partial state changes.
 begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[e1,e2,e3],'Three item bundle') returning id into t;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);counter:=public.create_trade_counter(t,5,'sender_pays','Cash adjustment');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);update public.listings set description='Newly disclosed damaged corner' where id=e3;
  rejected:=false;begin perform public.respond_trade_counter(counter,true);exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Changed listing terms were silently accepted';end if;
  if (select status from public.trade_counteroffers where id=counter)<>'pending' or (select count(*) from public.listings where id=any(array[target,e1,e2,e3]) and status='active')<>4 then raise exception 'Rejected stale counter partially changed inventory';end if;
  raise exception using errcode='P9001',message='rollback completed case';
 exception when sqlstate 'P9001' then null;end;
 -- Case 4: ownership, duplicate and target-item injection are denied.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 rejected:=false;begin insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[other],'Foreign collateral');exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Foreign inventory accepted';end if;
 rejected:=false;begin insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[e1,e1],'Duplicate collateral');exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Duplicate inventory accepted';end if;
 rejected:=false;begin insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[target],'Target as collateral');exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Target reused as collateral';end if;
 -- Case 5: accepting a price offer on an additional item closes the bundled proposal.
 begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[e1,e2,e3],'Three item bundle') returning id into t;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',c,'role','authenticated')::text,true);price_offer:=public.submit_price_offer(e3,25);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);perform public.respond_price_offer(price_offer,'accept',null);
  if (select status from public.trade_offers where id=t)<>'declined' then raise exception 'Price acceptance did not close extra-item trade';end if;
  if (select status from public.listings where id=e1)<>'active' then raise exception 'Losing bundle reserved unrelated collateral';end if;
  raise exception using errcode='P9001',message='rollback completed case';
 exception when sqlstate 'P9001' then null;end;
end $$;
reset role;
rollback;
