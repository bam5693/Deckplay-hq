-- Isolated staging only; all synthetic identities, listings and events roll back.
begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();outsider uuid:=gen_random_uuid();
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (a,'release-price-'||a||'@deckplay.test','{}'),
 (b,'release-price-'||b||'@deckplay.test','{}'),
 (outsider,'release-price-'||outsider||'@deckplay.test','{}');
 perform set_config('deckplay.release.price',jsonb_build_object('buyer',a,'seller',b,'outsider',outsider)::text,true);
end $$;
set local role authenticated;
do $$
declare f jsonb:=current_setting('deckplay.release.price')::jsonb;
 a uuid:=(f->>'buyer')::uuid;b uuid:=(f->>'seller')::uuid;x uuid:=(f->>'outsider')::uuid;
 kind text;item uuid;offer uuid;denied boolean;checked integer:=0;
begin
 foreach kind in array array['trading_cards','video_games','consoles','controllers','accessories','collectibles','other'] loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  insert into public.listings(seller_id,title,description,price,category,condition,image_urls,accepts_price_offers)
   values(b,'TEST ONLY release price actions','Synthetic negotiation',25,kind,'used',array['https://example.test/synthetic.jpg'],true) returning id into item;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  offer:=public.submit_price_offer(item,20);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',x,'role','authenticated')::text,true);
  denied:=false;begin perform public.respond_price_offer(offer,'withdraw');exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Outsider could withdraw in %',kind;end if;checked:=checked+1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  denied:=false;begin perform public.respond_price_offer(offer,'withdraw');exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Seller could withdraw buyer offer in %',kind;end if;checked:=checked+1;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform public.respond_price_offer(offer,'withdraw');
  if (select status from public.price_offers where id=offer)<>'withdrawn' then raise exception 'Withdrawal did not persist';end if;
  if exists(select 1 from public.listings where id=item and status<>'active') then raise exception 'Withdrawal reserved inventory';end if;checked:=checked+1;
  denied:=false;begin perform public.respond_price_offer(offer,'withdraw');exception when raise_exception then denied:=true;end;
  if not denied then raise exception 'Repeated withdrawal accepted';end if;checked:=checked+1;
  offer:=public.submit_price_offer(item,19);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  perform public.respond_price_offer(offer,'counter',22);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform public.respond_price_offer(offer,'withdraw');
  if (select status from public.price_offers where id=offer)<>'withdrawn' then raise exception 'Counter withdrawal failed';end if;checked:=checked+1;
  offer:=public.submit_price_offer(item,18);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  perform public.respond_price_offer(offer,'decline');
  if (select status from public.price_offers where id=offer)<>'declined' then raise exception 'Decline failed';end if;checked:=checked+1;
 end loop;
 if checked<>42 then raise exception 'Incomplete release price coverage';end if;
end $$;
reset role;
rollback;
select '42 price action, withdrawal, role-denial and inventory checks passed; all fixtures rolled back' as result;
