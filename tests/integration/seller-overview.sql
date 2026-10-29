begin;
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'overview-rollback-'||a||'@deckplay.test','{}'),(b,'overview-rollback-'||b||'@deckplay.test','{}');
 insert into public.listings(seller_id,title,price,status,category,condition,image_urls,accepts_price_offers,accepts_trades) values(a,'TEST ONLY OVERVIEW active',25.50,'active','trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),(a,'TEST ONLY OVERVIEW reserved',30,'reserved','trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),(a,'TEST ONLY OVERVIEW sold',40,'sold','trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true),(b,'TEST ONLY OVERVIEW other',999,'active','trading_cards','used',array['https://prrrzeelltmyugssqnzk.supabase.co/storage/v1/object/public/listing-images/test.jpg'],true,true);
 perform set_config('deckplay.overview.a',a::text,true);perform set_config('deckplay.overview.b',b::text,true);
end $$;
set local role authenticated;
do $$declare v jsonb;begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.overview.a'),'role','authenticated')::text,true);v:=public.get_my_seller_overview();
 if (v->>'active')::integer<>1 or (v->>'reserved')::integer<>1 or (v->>'sold')::integer<>1 or (v->>'active_asking_total')::numeric<>25.50 then raise exception 'Seller totals mixed states or another account';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.overview.b'),'role','authenticated')::text,true);v:=public.get_my_seller_overview();
 if (v->>'active_asking_total')::numeric<>999 or (v->>'sold')::integer<>0 then raise exception 'Other seller did not receive only their own totals';end if;
 -- The seller has a reply only while the counterpart is the latest actor.
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.overview.b'),'role','authenticated')::text,true);
 declare target uuid;offer uuid;trade uuid;counter uuid;begin
  select id into target from public.listings where seller_id=current_setting('deckplay.overview.a')::uuid and status='active';
  offer:=public.submit_price_offer(target,20);
  insert into public.trade_offers(listing_id,sender_id,recipient_id,offer_note) values(target,current_setting('deckplay.overview.b')::uuid,current_setting('deckplay.overview.a')::uuid,'Synthetic trade proposal') returning id into trade;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('deckplay.overview.a'),'role','authenticated')::text,true);v:=public.get_my_seller_overview();
  if (v->>'price_replies')::integer<>1 or (v->>'trade_replies')::integer<>1 then raise exception 'Incoming reply counts incorrect';end if;
  perform public.respond_price_offer(offer,'counter',23);
  counter:=public.create_trade_counter(trade,5,'sender_pays','Synthetic seller counter');v:=public.get_my_seller_overview();
  if (v->>'price_replies')::integer<>0 or (v->>'trade_replies')::integer<>0 then raise exception 'Seller counters incorrectly ask seller to reply';end if;
 end;
 if has_function_privilege('anon','public.get_my_seller_overview()','execute') then raise exception 'Anonymous seller data access granted';end if;
end $$;
reset role;
rollback;
