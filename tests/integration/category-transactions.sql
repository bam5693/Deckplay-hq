-- Generate with scripts/category-transaction-sql.cjs. Staging only, entire transaction rolls back.
begin;
select set_config('deckplay.category.rows','__CATEGORY_ROWS__',true);
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'category-rollback-'||a||'@deckplay.test','{}'),(b,'category-rollback-'||b||'@deckplay.test','{}');
 perform set_config('deckplay.category.a',a::text,true);perform set_config('deckplay.category.b',b::text,true);
end $$;
set local role authenticated;
do $$
declare row jsonb;persona text;rotation integer:=0;completed integer:=0;a uuid:=current_setting('deckplay.category.a')::uuid;b uuid:=current_setting('deckplay.category.b')::uuid;buyer uuid;seller uuid;target uuid;trade_target uuid;collateral uuid;msg uuid;price_offer uuid;trade_offer uuid;counter uuid;denied boolean;fields jsonb;
begin
 foreach persona in array array['Charles','Kyle','Tanner','Jayden'] loop
  rotation:=rotation+1;if rotation%2=1 then buyer:=a;seller:=b;else buyer:=b;seller:=a;end if;
  for row in select value from jsonb_array_elements(current_setting('deckplay.category.rows')::jsonb) loop
   fields:=row->'fields';
   begin
    target:=gen_random_uuid();trade_target:=gen_random_uuid();collateral:=gen_random_uuid();
    perform set_config('request.jwt.claims',jsonb_build_object('sub',seller,'role','authenticated')::text,true);
    insert into public.listings(id,seller_id,title,description,price,category,product_type,tcg_game,collectible_subcategory,condition,image_urls,accepts_trades,accepts_price_offers)
    select id,seller,'TEST ONLY CATEGORY '||persona,'TEST ONLY '||(row->>'key'),25,fields->>'category',fields->>'listingType',fields->>'tcgGame',fields->>'collectibleSubcategory','used',array['https://example.test/synthetic.jpg'],true,true from unnest(array[target,trade_target]) id;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',buyer,'role','authenticated')::text,true);
    insert into public.listings(id,seller_id,title,description,price,category,product_type,tcg_game,collectible_subcategory,condition,image_urls,accepts_trades,accepts_price_offers)
    values(collateral,buyer,'TEST ONLY CATEGORY collateral','TEST ONLY '||(row->>'key'),20,fields->>'category',fields->>'listingType',fields->>'tcgGame',fields->>'collectibleSubcategory','used',array['https://example.test/synthetic.jpg'],true,true);
    insert into public.saved_listings(user_id,listing_id) values(buyer,target);
    insert into public.collector_messages(sender_id,recipient_id,listing_id,body) values(buyer,seller,target,'TEST ONLY '||persona||' condition inquiry '||(row->>'key')) returning id into msg;
    price_offer:=public.submit_price_offer(target,20);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',seller,'role','authenticated')::text,true);
    if not exists(select 1 from public.collector_messages where id=msg and listing_id=target and sender_id=buyer) then raise exception 'Message lost category context';end if;
    update public.collector_messages set read_at=clock_timestamp() where id=msg;
    update public.listings set price=24 where id=target and seller_id=seller;
    perform public.respond_price_offer(price_offer,'counter',22);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',buyer,'role','authenticated')::text,true);
    if not exists(select 1 from public.collector_notifications where user_id=buyer and source_id=target and kind='favorite_price_drop') then raise exception 'Price-drop alert missing';end if;
    if not exists(select 1 from public.price_offers where id=price_offer and amount=22) then raise exception 'Counter terms missing';end if;
    perform public.respond_price_offer(price_offer,'accept',null);
    insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(trade_target,buyer,seller,array[collateral],'TEST ONLY category trade') returning id into trade_offer;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',seller,'role','authenticated')::text,true);
    if (select status from public.listings where id=target) is distinct from 'reserved' then raise exception 'Accepted price did not reserve target';end if;
    counter:=public.create_trade_counter(trade_offer,3,'sender_pays','TEST ONLY condition terms');
    perform set_config('request.jwt.claims',jsonb_build_object('sub',buyer,'role','authenticated')::text,true);
    perform public.respond_trade_counter(counter,true);
    if (select status from public.listings where id=collateral) is distinct from 'reserved' then raise exception 'Trade collateral not reserved';end if;
    denied:=false;begin perform public.respond_trade_counter(counter,true);exception when raise_exception then denied:=true;end;if not denied then raise exception 'Duplicate trade acceptance succeeded';end if;
    perform set_config('request.jwt.claims',jsonb_build_object('sub',seller,'role','authenticated')::text,true);
    if (select status from public.listings where id=trade_target) is distinct from 'reserved' then raise exception 'Trade target not reserved';end if;
    raise exception using errcode='P9001',message='rollback successful category journey';
   exception when sqlstate 'P9001' then null;
   end;
   completed:=completed+1;
  end loop;
 end loop;
 perform set_config('deckplay.category.results',jsonb_build_object('scope','authenticated database role/RPC transactions, not browser or HTTP certification','personas',4,'combinations',jsonb_array_length(current_setting('deckplay.category.rows')::jsonb),'journeys',completed,'passed',true,'features',jsonb_build_array('listing creation and category assignment','favorites','contextual messages and read receipts','price offers and counters','price-drop alerts','trade proposals and counters','atomic reservations','duplicate acceptance denial'),'unverified',jsonb_build_array('image uploads','seller-profile UI','mobile usability','per-category browser transaction flows'))::text,true);
end $$;
select current_setting('deckplay.category.results')::jsonb as report;
reset role;
rollback;
