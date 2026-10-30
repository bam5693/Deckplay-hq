-- Isolated staging only. Synthetic accounts/inventory/transactions fully roll back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'category-lifecycle-'||a||'@deckplay.test','{}'),(b,'category-lifecycle-'||b||'@deckplay.test','{}');
 perform set_config('deckplay.lifecycle.fixture',jsonb_build_object('a',a,'b',b)::text,true);
end $$;
set local role authenticated;
do $$
declare f jsonb:=current_setting('deckplay.lifecycle.fixture')::jsonb;a uuid:=(f->>'a')::uuid;b uuid:=(f->>'b')::uuid;kind text;target uuid;offered uuid;t uuid;counter uuid;rejected boolean;snaps jsonb;checked int:=0;
begin
 foreach kind in array array['trading_cards','video_games','consoles','controllers','accessories','collectibles','other'] loop
  target:=gen_random_uuid();offered:=gen_random_uuid();
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  insert into public.listings(id,seller_id,title,description,price,category,condition,image_urls,accepts_trades,accepts_price_offers) values(target,b,'TEST ONLY LIFECYCLE '||kind,E'[Listing contents]\nQuantity included: 3\nUnit: items\nSold together for the listing price.\nContents:\n2x Original variant\n1x Different condition\n[End listing contents]',30,kind,'used',array['https://deckplay-hq-staging.cstivers56.workers.dev/test-inventory-placeholder.svg'],true,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  insert into public.listings(id,seller_id,title,description,price,category,condition,image_urls,accepts_trades,accepts_price_offers) values(offered,a,'TEST ONLY LIFECYCLE offered '||kind,'Exact synthetic condition',25,kind,'used',array['https://deckplay-hq-staging.cstivers56.workers.dev/test-inventory-placeholder.svg'],true,true);
  -- Sender cancellation never reserves inventory.
  begin
   insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[offered],'Synthetic cancel') returning id into t;
   perform public.respond_trade_offer(t,'cancelled');
   if (select status from public.trade_offers where id=t)<>'cancelled' or (select count(*) from public.listings where id=any(array[target,offered]) and status='active')<>2 then raise exception 'Cancellation state failed for %',kind;end if;
   raise exception using errcode='P9001',message='rollback case';
  exception when sqlstate 'P9001' then checked:=checked+1;end;
  -- Recipient decline never reserves inventory.
  begin
   insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[offered],'Synthetic decline') returning id into t;
   perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);perform public.respond_trade_offer(t,'declined');
   if (select status from public.trade_offers where id=t)<>'declined' or (select count(*) from public.listings where id=any(array[target,offered]) and status='active')<>2 then raise exception 'Decline state failed for %',kind;end if;
   raise exception using errcode='P9001',message='rollback case';
  exception when sqlstate 'P9001' then checked:=checked+1;end;
  -- Acceptance captures quantity disclosures, reserves the whole listing, and rejects repeats.
  begin
   perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
   insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[offered],'Synthetic accept') returning id,item_snapshots into t,snaps;
   if not exists(select 1 from jsonb_array_elements(snaps) s where s->>'listing_id'=target::text and s->>'description' like '%Quantity included: 3%') then raise exception 'Quantity snapshot missing for %',kind;end if;
   perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);perform public.respond_trade_offer(t,'accepted');
   if (select count(*) from public.listings where id=any(array[target,offered]) and status='reserved')<>2 then raise exception 'Acceptance reservation failed for %',kind;end if;
   rejected:=false;begin perform public.respond_trade_offer(t,'accepted');exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Duplicate acceptance succeeded for %',kind;end if;
   raise exception using errcode='P9001',message='rollback case';
  exception when sqlstate 'P9001' then checked:=checked+1;end;
  -- Both-party cash counter acceptance reserves the same complete inventory.
  begin
   perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
   insert into public.trade_offers(listing_id,sender_id,recipient_id,offered_listing_ids,offer_note) values(target,a,b,array[offered],'Synthetic counter') returning id into t;
   perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);counter:=public.create_trade_counter(t,5,'sender_pays','Synthetic revised cash');
   perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);perform public.respond_trade_counter(counter,true);
   if (select count(*) from public.listings where id=any(array[target,offered]) and status='reserved')<>2 or (select cash_amount from public.trade_offers where id=t)<>5 then raise exception 'Counter acceptance failed for %',kind;end if;
   raise exception using errcode='P9001',message='rollback case';
  exception when sqlstate 'P9001' then checked:=checked+1;end;
 end loop;
 if checked<>28 then raise exception 'Incomplete category lifecycle coverage: %',checked;end if;
end $$;
reset role;
rollback;
select '28 category trade lifecycle scenarios passed; all fixtures rolled back' as result;
