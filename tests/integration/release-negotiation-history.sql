-- Isolated staging only. Real negotiation RPCs generate 51 timestamp-tied events.
begin;
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();x uuid:=gen_random_uuid();begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,'release-history-'||a||'@deckplay.test','{}'),(b,'release-history-'||b||'@deckplay.test','{}'),(x,'release-history-'||x||'@deckplay.test','{}');
 perform set_config('deckplay.release.history',jsonb_build_object('a',a,'b',b,'x',x)::text,true);
end $$;
set local role authenticated;
do $$
declare f jsonb:=current_setting('deckplay.release.history')::jsonb;a uuid:=(f->>'a')::uuid;b uuid:=(f->>'b')::uuid;x uuid:=(f->>'x')::uuid;item uuid;offer uuid;actor uuid;seen uuid[];page_ids uuid[];cursor_row record;
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 insert into public.listings(seller_id,title,description,price,category,condition,image_urls,accepts_price_offers)
 values(b,'TEST ONLY release negotiation paging','Synthetic history',100,'other','used',array['https://example.test/synthetic.jpg'],true) returning id into item;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 offer:=public.submit_price_offer(item,10);
 for i in 1..50 loop
  actor:=case when i%2=1 then b else a end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  perform public.respond_price_offer(offer,'counter',10+i);
 end loop;
 select array_agg(id order by created_at desc,id desc) into seen from (select id,created_at from public.price_offer_history where offer_id=offer and ((buyer_id=a and seller_id=b) or (buyer_id=b and seller_id=a)) order by created_at desc,id desc limit 50) p;
 if cardinality(seen)<>50 then raise exception 'First negotiation page incomplete';end if;
 select id,created_at into cursor_row from public.price_offer_history where id=any(seen) order by created_at,id limit 1;
 select array_agg(id) into page_ids from public.price_offer_history where offer_id=offer and ((buyer_id=a and seller_id=b) or (buyer_id=b and seller_id=a)) and (created_at<cursor_row.created_at or (created_at=cursor_row.created_at and id<cursor_row.id));
 if cardinality(page_ids)<>1 or seen&&page_ids then raise exception 'Negotiation keyset lost/repeated tied event';end if;
 if (select count(distinct created_at) from public.price_offer_history where offer_id=offer)<>1 then raise exception 'Fixture must exercise identical timestamp boundary';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',x,'role','authenticated')::text,true);
 if exists(select 1 from public.price_offer_history where offer_id=offer) then raise exception 'Outsider read negotiation history';end if;
end $$;
reset role;
rollback;
select '51 real negotiation events paged 50+1 without duplicates; outsider RLS denied; fixtures rolled back' as result;
